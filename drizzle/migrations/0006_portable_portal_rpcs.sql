CREATE OR REPLACE FUNCTION public.portal_token_actor(p_token text) RETURNS public.portal_sessions LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
  SELECT * FROM public.portal_sessions WHERE token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex') AND expires_at>now() LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.portal_token_actor(text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.portal_me(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE s public.portal_sessions; BEGIN s:=public.portal_token_actor(p_token); IF s.user_id IS NULL THEN RETURN NULL; END IF; RETURN public.portal_account(s.account_type,s.user_id); END $$;

CREATE OR REPLACE FUNCTION public.portal_logout(p_token text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,extensions AS $$
  DELETE FROM public.portal_sessions WHERE token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex') $$;

CREATE OR REPLACE FUNCTION public.portal_change_password(p_token text,p_current text,p_new text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE s public.portal_sessions; tbl text; h text; BEGIN
  s:=public.portal_token_actor(p_token); IF s.user_id IS NULL THEN RAISE EXCEPTION 'Please sign in again.'; END IF;
  IF p_new IS NULL OR length(p_new)<6 OR length(p_new)>100 THEN RETURN jsonb_build_object('success',false,'message','Use between 6 and 100 characters.'); END IF;
  IF p_new='6667' THEN RETURN jsonb_build_object('success',false,'message','Choose a password other than the starting password 6667.'); END IF;
  IF p_new=p_current THEN RETURN jsonb_build_object('success',false,'message','Your new password must be different from your current one.'); END IF;
  IF NOT public.consume_portal_auth_attempt('portal-change:'||s.user_id) THEN RETURN jsonb_build_object('success',false,'message','Too many attempts. Please try again in 15 minutes.'); END IF;
  tbl:=CASE s.account_type WHEN 'student' THEN 'students' WHEN 'teacher' THEN 'teachers' ELSE 'admins' END;
  EXECUTE format('SELECT password_hash FROM public.%I WHERE id=$1',tbl) INTO h USING s.user_id;
  IF h IS NULL OR h !~ '^\$2[aby]\$' OR crypt(p_current,replace(h,'$2b$','$2a$'))<>replace(h,'$2b$','$2a$') THEN RETURN jsonb_build_object('success',false,'message','Your current password is not correct.'); END IF;
  EXECUTE format('UPDATE public.%I SET password_hash=$1, must_change_password=false WHERE id=$2',tbl) USING crypt(p_new,gen_salt('bf',10)), s.user_id;
  RETURN jsonb_build_object('success',true); END $$;

CREATE OR REPLACE FUNCTION public.portal_election(p_token text,p_req jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE s public.portal_sessions; uid uuid; r text; commission boolean; st public.coordinator_settings; tbl text:=p_req->>'table'; act text:=p_req->>'action'; v jsonb:=coalesce(p_req->'values','{}'); one boolean:=coalesce((p_req->>'single')::boolean,false);
  f jsonb:=coalesce((SELECT jsonb_object_agg(e->>'key',e->'value') FROM jsonb_array_elements(coalesce(p_req->'filters','[]')) e),'{}'); res jsonb; cur public.coordinator_applications; target uuid; newstatus text;
BEGIN
  s:=public.portal_token_actor(p_token); IF s.user_id IS NULL THEN RAISE EXCEPTION 'Please sign in to your school account.'; END IF;
  uid:=s.user_id; r:=s.account_type;
  commission:= r='admin' OR EXISTS(SELECT 1 FROM public.coordinator_commission_roles WHERE user_id=uid);
  SELECT * INTO st FROM public.coordinator_settings WHERE id=1;
  IF tbl='election_settings' THEN
    IF act='select' THEN RETURN jsonb_build_object('data', CASE WHEN one THEN to_jsonb(st) ELSE jsonb_build_array(to_jsonb(st)) END); END IF;
    IF NOT commission OR act<>'update' THEN RAISE EXCEPTION 'Only the Electoral Commission can do this.'; END IF;
    UPDATE public.coordinator_settings SET voting_open=coalesce((v->>'voting_open')::boolean,voting_open), applications_open=coalesce((v->>'applications_open')::boolean,applications_open), results_public=coalesce((v->>'results_public')::boolean,results_public),
      announcement=CASE WHEN v?'announcement' THEN left(v->>'announcement',2000) ELSE announcement END,
      voting_starts_at=CASE WHEN v?'voting_starts_at' THEN (v->>'voting_starts_at')::timestamptz ELSE voting_starts_at END,
      voting_ends_at=CASE WHEN v?'voting_ends_at' THEN (v->>'voting_ends_at')::timestamptz ELSE voting_ends_at END, updated_at=now() WHERE id=1;
    RETURN jsonb_build_object('data',null);
  ELSIF tbl='electoral_votes' THEN
    IF act='select' THEN RETURN jsonb_build_object('data',coalesce((SELECT jsonb_agg(jsonb_build_object('position',position,'application_id',application_id)) FROM public.coordinator_votes WHERE voter_id=uid),'[]')); END IF;
    IF act='delete' THEN IF NOT commission THEN RAISE EXCEPTION 'Only the Electoral Commission can do this.'; END IF; DELETE FROM public.coordinator_votes WHERE id IS NOT NULL; RETURN jsonb_build_object('data',null); END IF;
    IF act<>'insert' OR r<>'student' THEN RAISE EXCEPTION 'Only pupils can cast a ballot.'; END IF;
    INSERT INTO public.coordinator_votes(application_id,position,voter_id) VALUES((v->>'application_id')::uuid, v->>'position', uid);
    RETURN jsonb_build_object('data',null);
  ELSIF tbl='electoral_applications' THEN
    IF act='select' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC),'[]') INTO res FROM public.coordinator_applications a
       WHERE (commission OR (CASE WHEN f?'user_id' THEN a.user_id=uid ELSE a.status='approved' END))
         AND (NOT f?'status' OR a.status=f->>'status') AND (NOT f?'id' OR a.id=(f->>'id')::uuid);
      RETURN jsonb_build_object('data', CASE WHEN one THEN res->0 ELSE res END);
    END IF;
    IF act='delete' THEN IF NOT commission THEN RAISE EXCEPTION 'Only the Electoral Commission can do this.'; END IF; DELETE FROM public.coordinator_applications WHERE id=(f->>'id')::uuid; RETURN jsonb_build_object('data',null); END IF;
    IF act='update' THEN
      target:=(f->>'id')::uuid; SELECT * INTO cur FROM public.coordinator_applications WHERE id=target; IF cur.id IS NULL THEN RAISE EXCEPTION 'Application not found.'; END IF;
      IF commission AND NOT EXISTS(SELECT 1 FROM jsonb_object_keys(v) k WHERE k NOT IN ('status','updated_at')) THEN
        newstatus:=v->>'status'; IF newstatus NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'Invalid status.'; END IF;
        UPDATE public.coordinator_applications SET status=newstatus, updated_at=now() WHERE id=target; RETURN jsonb_build_object('data',null);
      END IF;
      IF cur.user_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'You cannot edit another pupil''s application.'; END IF;
    END IF;
    IF NOT commission AND NOT (r='student' AND st.applications_open AND (cur.id IS NULL OR cur.status='pending')) THEN RAISE EXCEPTION 'Applications are closed or your application has already been reviewed.'; END IF;
    IF coalesce(v->>'student_name','')='' OR coalesce(v->>'class_name','')='' OR coalesce(v->>'position','')='' THEN RAISE EXCEPTION 'Complete your candidate details.'; END IF;
    IF length(coalesce(v->>'manifesto',''))>10000 OR length(coalesce(v->>'experience',''))>5000 OR length(coalesce(v->>'photo_url',''))>500000 OR jsonb_array_length(coalesce(v->'manifesto_photos','[]'))>6 THEN RAISE EXCEPTION 'Application is too large.'; END IF;
    IF act='insert' THEN
      INSERT INTO public.coordinator_applications(student_name,class_name,stream_name,age,position,experience,manifesto,photo_url,manifesto_photos,youtube_url,user_id,status)
      VALUES(left(v->>'student_name',200),left(v->>'class_name',50),left(v->>'stream_name',50),(v->>'age')::int,left(v->>'position',100),v->>'experience',coalesce(v->>'manifesto',''),v->>'photo_url',
        coalesce(ARRAY(SELECT jsonb_array_elements_text(v->'manifesto_photos')),'{}'),v->>'youtube_url', CASE WHEN commission THEN NULL ELSE uid END, CASE WHEN commission THEN 'approved' ELSE 'pending' END);
    ELSE
      UPDATE public.coordinator_applications SET student_name=left(v->>'student_name',200),class_name=left(v->>'class_name',50),stream_name=left(v->>'stream_name',50),age=(v->>'age')::int,position=left(v->>'position',100),experience=v->>'experience',manifesto=coalesce(v->>'manifesto',''),photo_url=v->>'photo_url',
        manifesto_photos=coalesce(ARRAY(SELECT jsonb_array_elements_text(v->'manifesto_photos')),'{}'),youtube_url=v->>'youtube_url',status='pending',updated_at=now() WHERE id=target;
    END IF;
    RETURN jsonb_build_object('data',null);
  ELSIF tbl='user_roles' THEN
    IF NOT commission THEN RAISE EXCEPTION 'Only the Electoral Commission can do this.'; END IF;
    target:=coalesce(v->>'user_id',f->>'user_id')::uuid; IF target=uid THEN RAISE EXCEPTION 'You cannot change your own Commission access.'; END IF;
    IF act='insert' THEN INSERT INTO public.coordinator_commission_roles(user_id,granted_by) VALUES(target,uid);
    ELSIF act='delete' THEN DELETE FROM public.coordinator_commission_roles WHERE user_id=target;
    ELSE RAISE EXCEPTION 'Unsupported Commission action.'; END IF;
    RETURN jsonb_build_object('data',null);
  END IF;
  RAISE EXCEPTION 'Use your portal profile to manage your school account.';
END $$;

CREATE OR REPLACE FUNCTION public.portal_election_rpc(p_token text,p_name text,p_args jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE s public.portal_sessions; uid uuid; commission boolean; pub boolean; BEGIN
  s:=public.portal_token_actor(p_token); IF s.user_id IS NULL THEN RAISE EXCEPTION 'Please sign in to your school account.'; END IF; uid:=s.user_id;
  commission:= s.account_type='admin' OR EXISTS(SELECT 1 FROM public.coordinator_commission_roles WHERE user_id=uid);
  IF p_name='has_role' THEN RETURN to_jsonb(commission); END IF;
  IF p_name='record_page_view' THEN UPDATE public.coordinator_settings SET page_views=page_views+1 WHERE id=1; RETURN 'null'; END IF;
  IF p_name='record_candidate_view' THEN UPDATE public.coordinator_applications SET view_count=view_count+1 WHERE id=(p_args->>'_id')::uuid; RETURN 'null'; END IF;
  SELECT results_public INTO pub FROM public.coordinator_settings WHERE id=1;
  IF p_name='get_vote_counts' THEN
    IF NOT coalesce(pub,false) AND NOT commission THEN RETURN '[]'; END IF;
    RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('application_id',application_id,'votes',n)) FROM (SELECT application_id,count(*) n FROM public.coordinator_votes GROUP BY 1) q),'[]');
  END IF;
  IF NOT commission THEN RAISE EXCEPTION 'Only the Electoral Commission can do this.'; END IF;
  IF p_name='get_turnout' THEN RETURN jsonb_build_array(jsonb_build_object('voters',(SELECT count(DISTINCT voter_id) FROM public.coordinator_votes),'ballots',(SELECT count(*) FROM public.coordinator_votes),'accounts',(SELECT count(*) FROM public.students))); END IF;
  IF p_name='admin_list_users' THEN RETURN coalesce((SELECT jsonb_agg(x) FROM (
    SELECT jsonb_build_object('id',p.id,'email',p.email,'full_name',p.name,'class_name',p.class_id,'stream_name',p.stream_id,'created_at',p.created_at,'is_admin',EXISTS(SELECT 1 FROM public.coordinator_commission_roles c WHERE c.user_id=p.id),'has_voted',EXISTS(SELECT 1 FROM public.coordinator_votes w WHERE w.voter_id=p.id)) x FROM public.students p
    UNION ALL SELECT jsonb_build_object('id',a.id,'email',a.email,'full_name',a.name,'class_name',null,'stream_name',null,'created_at',a.created_at,'is_admin',true,'has_voted',false) FROM public.admins a) q),'[]'); END IF;
  RAISE EXCEPTION 'Unsupported request.';
END $$;

REVOKE ALL ON FUNCTION public.portal_me(text), public.portal_logout(text), public.portal_change_password(text,text,text), public.portal_election(text,jsonb), public.portal_election_rpc(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_me(text), public.portal_logout(text), public.portal_change_password(text,text,text), public.portal_election(text,jsonb), public.portal_election_rpc(text,text,jsonb) TO anon, authenticated, service_role;
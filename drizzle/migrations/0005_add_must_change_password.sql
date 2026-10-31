ALTER TABLE public.students ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.students.must_change_password IS 'Server-only flag: account still uses the shared starting password and must choose its own.';
COMMENT ON COLUMN public.teachers.must_change_password IS 'Server-only flag: account still uses the shared starting password and must choose its own.';
COMMENT ON COLUMN public.admins.must_change_password IS 'Server-only flag: account still uses the shared starting password and must choose its own.';
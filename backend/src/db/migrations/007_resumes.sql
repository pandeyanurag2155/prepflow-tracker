-- Uploaded resume files (PDF / DOC / DOCX), kept in the database so they survive restarts and
-- are backed up with it. Newest first in the UI.
CREATE TABLE resumes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text NOT NULL DEFAULT '' CHECK (length(label) <= 100),
  filename      text NOT NULL CHECK (length(filename) BETWEEN 1 AND 200),
  content_type  text NOT NULL CHECK (content_type IN (
                  'application/pdf', 'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes    integer NOT NULL CHECK (size_bytes > 0),
  data          bytea NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resumes_created_at_idx ON resumes (created_at DESC);

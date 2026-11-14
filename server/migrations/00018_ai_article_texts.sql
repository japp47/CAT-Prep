-- Article text in object storage (D107, docs/design/article-to-rc.md, "Where the article text lives"). The text is
-- kept in a private Cloudflare R2 bucket under its hash; these tables say which hashes are stored and which students
-- may read them. A student may read an article only after making a set from it. Kept 90 days, like the bucket's own
-- lifecycle rule.

-- +goose Up
create table ai.article_texts (
  hash      bytea primary key check (octet_length(hash) = 32),
  bytes     integer not null check (bytes between 1 and 65536),
  stored_at timestamptz not null default now()
);
comment on table ai.article_texts is 'Article texts stored in R2 under their hash: never the text itself here';

create table ai.student_articles (
  identity_id uuid not null references account.identities (id) on delete cascade,
  job_id      uuid not null,
  hash        bytea not null check (octet_length(hash) = 32),
  created_at  timestamptz not null default now(),
  primary key (identity_id, job_id)
);
comment on table ai.student_articles is 'Which student made a set from which article: the right to read its text';

grant select, insert, update, delete on ai.article_texts, ai.student_articles to cat_app;
grant select on ai.article_texts to cat_readonly;

-- +goose Down
drop table ai.student_articles;
drop table ai.article_texts;

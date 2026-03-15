ALTER TABLE "project" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;
ALTER TABLE "project" ADD COLUMN "slug" text;

-- Backfill: slugify existing project names
UPDATE "project" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM("name"), '[^a-zA-Z0-9\s-]', '', 'g'), '[\s]+', '-', 'g')) WHERE "slug" IS NULL;
-- Handle any empty slugs (fallback to id)
UPDATE "project" SET "slug" = "id" WHERE "slug" IS NULL OR "slug" = '';
-- Handle duplicates within same org by appending random suffix
UPDATE "project" p1 SET "slug" = p1."slug" || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4)
WHERE EXISTS (
  SELECT 1 FROM "project" p2
  WHERE p2."organization_id" = p1."organization_id" AND p2."slug" = p1."slug" AND p2."id" < p1."id"
);

ALTER TABLE "project" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "project_org_slug_uidx" ON "project" ("organization_id", "slug");

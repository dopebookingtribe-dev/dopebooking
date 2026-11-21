-- Phase 12a: Art Gallery collaboration inquiries reuse the service request
-- workflow (quotes, messages, notifications, email). Kept separate because
-- Postgres can't use a new enum value in the transaction that adds it.
alter type public.service_type add value if not exists 'art_gallery';

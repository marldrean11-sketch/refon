-- Carts become user-owned: a cart belongs to exactly one signed-in buyer.
--
-- Buying is a buyer action. Until now a visitor could hold a real cart through an
-- opaque `refon_cart` cookie, and signing in merged that cart into the account one.
-- With buyer-only purchasing there is nothing for a visitor to hold before they
-- sign in, so the guest identity, its column, its indexes, and the XOR constraint
-- that permitted exactly one of the two owners are all removed.
--
-- Order matters below. Live guest holds are released *before* their rows are
-- deleted, so the partial unique index on active reservations is never left holding
-- a listing that is about to become free, and no buyer's hold is invalidated by
-- this migration.

-- 1. Retire every live guest hold first.
--
-- Only guest carts are touched. Holds that already have released_at set are left
-- alone, and no buyer's hold is disturbed: the WHERE clause on user_id IS NULL is
-- what makes this safe to run against a live database.
UPDATE reservations
SET released_at = now()
WHERE released_at IS NULL
  AND cart_item_id IN (
    SELECT ci.id
    FROM cart_items ci
    JOIN carts c ON c.id = ci.cart_id
    WHERE c.user_id IS NULL
  );

-- 2. Delete the guest carts themselves.
--
-- cart_items and reservations cascade from here, so their guest-owned rows go with
-- them. Buyer carts are untouched.
DELETE FROM carts WHERE user_id IS NULL;

-- 3. Drop the guest-only constraints before the column they reference.
--
-- carts_single_owner_check is the XOR ("exactly one of user_id, guest_token_hash").
-- It cannot survive the column it is written in terms of.
ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_single_owner_check;
ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_guest_token_hash_format_check;

-- 4. Drop the guest identity's indexes and column.
DROP INDEX IF EXISTS carts_guest_token_hash_key;
DROP INDEX IF EXISTS carts_guest_token_hash_idx;
ALTER TABLE carts DROP COLUMN IF EXISTS guest_token_hash;

-- 5. Every remaining cart belongs to a user, so make that structural.
--
-- The SET NOT NULL is what stops the next migration, or a bug, from quietly
-- reintroducing an ownerless cart.
ALTER TABLE carts ALTER COLUMN user_id SET NOT NULL;

-- 6. The per-owner lookup index is redundant with the unique constraint on user_id,
--    which already indexes the column. Removed rather than left as dead weight.
DROP INDEX IF EXISTS carts_user_id_idx;
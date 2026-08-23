-- Rename asset_class to sub_class in target_allocations table
ALTER TABLE target_allocations 
RENAME COLUMN asset_class TO sub_class;

-- Update the constraint/index if any exists
COMMENT ON COLUMN target_allocations.sub_class IS 'Asset sub-class for more granular allocation targets';
-- Add available_from field to properties table
-- This field indicates the earliest date a property is available for move-in

ALTER TABLE public.properties
ADD COLUMN available_from DATE DEFAULT CURRENT_DATE;

-- Add index for better query performance
CREATE INDEX idx_properties_available_from ON public.properties(available_from);

-- Add comment for documentation
COMMENT ON COLUMN public.properties.available_from IS 'Earliest date the property is available for move-in';

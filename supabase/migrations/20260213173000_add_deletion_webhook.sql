-- Enable the pg_net extension to allow HTTP requests from SQL
CREATE EXTENSION IF NOT EXISTS net WITH SCHEMA extensions;

-- Create the trigger function that calls the Edge Function
CREATE OR REPLACE FUNCTION public.on_property_deleted_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- We call the Edge Function asynchronously via pg_net
  -- Replace <PROJECT_REF> with the actual project ref if needed, 
  -- but usually 'http://localhost:54321/functions/v1/...' or the cloud URL works.
  -- For production, it's better to use the internal URL or a configurable variable.
  -- Here we assume the standard Supabase Edge Function URL structure.
  
  PERFORM net.http_post(
    url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/delete-property-photos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'apikey'
    ),
    body := jsonb_build_object(
      'old_record', jsonb_build_object(
        'id', OLD.id,
        'landlord_id', OLD.landlord_id
      )
    )
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the properties table
DROP TRIGGER IF EXISTS on_property_deleted_trigger ON public.properties;
CREATE TRIGGER on_property_deleted_trigger
  AFTER DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.on_property_deleted_cleanup();

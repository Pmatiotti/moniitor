-- Protect fundamental_data from unauthorized modifications
-- Only service role (backend functions) can write to this table

CREATE POLICY "Anyone can read fundamental data"
  ON public.fundamental_data
  FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert fundamental data"
  ON public.fundamental_data
  FOR INSERT
  WITH CHECK (false); -- Only service role can bypass this

CREATE POLICY "Only service role can update fundamental data"
  ON public.fundamental_data
  FOR UPDATE
  USING (false);

CREATE POLICY "Only service role can delete fundamental data"
  ON public.fundamental_data
  FOR DELETE
  USING (false);
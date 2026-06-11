-- Migration: channel reactions and payment sticker events
  -- Run this in Supabase SQL Editor (Settings > SQL Editor)

  CREATE TABLE IF NOT EXISTS public.channel_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'like')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(message_id, user_id, reaction_type)
  );

  CREATE TABLE IF NOT EXISTS public.payment_sticker_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    app_name TEXT NOT NULL,
    nombre_en_app TEXT,
    sticker_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Enable RLS but allow service role full access
  ALTER TABLE public.channel_reactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.payment_sticker_events ENABLE ROW LEVEL SECURITY;

  -- Allow all authenticated users to read reactions
  CREATE POLICY IF NOT EXISTS "read_reactions" ON public.channel_reactions
    FOR SELECT TO authenticated USING (true);

  -- Allow all authenticated users to read payment stickers
  CREATE POLICY IF NOT EXISTS "read_stickers" ON public.payment_sticker_events
    FOR SELECT TO authenticated USING (true);
  
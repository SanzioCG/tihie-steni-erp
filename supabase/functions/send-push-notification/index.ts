import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, body, data } = await req.json()

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'title va body majburiy' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // VAPID kalitlarini sozlash
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    // Supabase client (service role — RLS bypass)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Admin va director rolidagi foydalanuvchilarni topish
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'director'])

    if (profilesError) throw profilesError

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Admin yoki director topilmadi' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userIds = profiles.map(p => p.id)

    // Ularning push subscription'larini topish
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (subsError) throw subsError

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Subscription topilmadi' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Har biriga notification yuborish
    const payload = JSON.stringify({ title, body, data: data || {} })
    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          payload
        )
      )
    )

    // Xato bo'lgan subscription'larni tozalash (410 = expired)
    const expiredIds = []
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        const err: any = result.reason
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredIds.push(subscriptions[idx].id)
        }
      }
    })

    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds)
    }

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return new Response(
      JSON.stringify({
        success: true,
        sent: succeeded,
        failed,
        cleaned: expiredIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Push notification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
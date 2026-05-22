import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. So'rovchi user'ni aniqlash
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // So'rovchi user'ni token orqali olamiz
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(token)
    
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. So'rovchi director yoki admin ekanini tekshirish
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || !['admin', 'director'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Tana ma'lumotlarini olish
    const { email, password, full_name, role } = await req.json()

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Barcha maydonlar talab qilinadi' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Director admin yarata olmaydi
    if (callerProfile.role === 'director' && role === 'admin') {
      return new Response(JSON.stringify({ error: 'Director admin yarata olmaydi' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Yangi auth user yaratish
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createErr) throw createErr

    // 6. Profile yozish
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .insert([{ 
        id: newUser.user.id, 
        email, 
        full_name, 
        role 
      }])

    if (profileErr) {
      // Rollback — auth user'ni o'chirish
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw profileErr
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('create-staff error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
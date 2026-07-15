# Fase 2 — Registro, verificación y bono de bienvenida

Empezamos por el bloque de registro/onboarding, que es la base de todo lo demás (sin registro robusto, no tiene sentido tocar recargas/retiros).

## Qué se construye

1. **Verificación por código de 6 dígitos por email**
   - Cambio de `signUp` (magic link) a `signInWithOtp({ email, options: { shouldCreateUser: true, data: {...} } })`.
   - Pantalla nueva `/verify` con 6 inputs, reenvío con cooldown de 60s, validación con `verifyOtp({ type: 'email' })`.
   - Los metadatos (`username`, `phone`, `invitation_code`) se pasan en `options.data` y el trigger `handle_new_user` los usa como ya lo hace.

2. **Selector de código país con banderas + búsqueda**
   - Componente `CountryCodeSelect` con lista embebida (ISO, nombre, código, emoji bandera) y buscador.
   - Se integra en `/register` reemplazando el input `+58 …` actual. El número final se guarda como `+<code><number>`.
   - Sin dependencias nuevas pesadas (lista JSON local, ~250 países).

3. **Bono $5 + auto-compra del Plan Debut $5 al registrarse**
   - Migración: insertar plan `Debut` ($5, 5%/día, 30 días) si no existe.
   - Modificar `handle_new_user` para:
     - Acreditar $5.00 (en vez de $1.00) como `bonus` con descripción "Bono de bienvenida Solaris".
     - Crear automáticamente una `investments` fila del Plan Debut para el nuevo usuario (sin descontar saldo, ya que es cortesía).
     - Marcar en `profiles` un flag `bonus_locked boolean default true` que se usará en la Fase 3 para bloquear retiros hasta que el usuario invierta con su propio dinero.
   - Ajustar `transactions.description` de "Bono de registro" existente.

4. **Restricción 1 cuenta por IP**
   - Nueva tabla `signup_ips (user_id, ip inet, created_at)` + policy solo `service_role`.
   - Server function `registerWithOtp` que:
     - Lee IP desde `getRequestHeader('x-forwarded-for')`.
     - Rechaza si ya existe un registro con esa IP en las últimas 24 h (o siempre, configurable — por defecto: siempre).
     - Llama `supabaseAdmin.auth.signInWithOtp` con los metadatos.
   - `/register` deja de llamar `supabase.auth.signUp` directamente y usa `useServerFn(registerWithOtp)`.

## Detalles técnicos

- Nueva migración SQL:
  - `ALTER TABLE profiles ADD COLUMN bonus_locked boolean NOT NULL DEFAULT true;`
  - `INSERT INTO plans` para Plan Debut si no existe.
  - Reescribir `handle_new_user` (bono $5 + auto-investment + flag).
  - Crear `signup_ips` con RLS (solo service_role).
- Nuevos archivos:
  - `src/lib/auth-otp.functions.ts` — `registerWithOtp`, `verifyOtp`, `resendOtp`.
  - `src/routes/verify.tsx` — pantalla de 6 dígitos.
  - `src/components/CountryCodeSelect.tsx` + `src/lib/countries.ts`.
- Archivos editados:
  - `src/routes/register.tsx` — usar server function + selector país + redirect a `/verify`.

## Lo que NO entra en esta fase

- Recargas/retiros/horarios/comprobantes (Fase 3).
- Trading, fondo global, cron de ganancias (Fase 4).
- Soporte flotante, skeletons, countdown ganancias en dashboard (Fase 5).

Después de esta fase avanzo a la Fase 3 en el siguiente turno.

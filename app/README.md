# Plato

App de nutrición para Francisco y Lua: el plan de la nutricionista día a día, con fotos, pasos y macros.

## Desarrollo

```bash
npm install
npm run dev
```

## Publicación (GitHub Pages)

La publica automáticamente `.github/workflows/deploy.yml` cada vez que se sube a `main` algún cambio en `app/`.
Queda en `https://<usuario>.github.io/<repositorio>/`.

Una sola vez, en GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Para probar la versión publicada en local:

```bash
npm run build
npm run preview
```

y abrir `http://localhost:4173/NutriPlan/`.

## Instalar en el iPhone

Abrir la dirección en Safari → botón Compartir → **Añadir a pantalla de inicio**.

## Accesos y datos (Supabase) — puesta en marcha

La app solo deja entrar a usuarios que el administrador aprueba. Los datos, las fotos
y las páginas de los planes están en Supabase, protegidos por reglas RLS.

1. Crea un proyecto gratuito en supabase.com.
2. SQL Editor → pega y ejecuta `supabase/plato.sql`.
3. Copia `.env.example` a `.env.production` con la URL y la clave anon del proyecto
   (Project Settings → API). Son públicas por diseño, se pueden subir a git.
4. Authentication → Users → Add user: tu correo y una contraseña genérica
   (marca "Auto Confirm User").
5. SQL Editor: `select plato_make_admin('tu@correo.com');`
   La app te pedirá cambiar la contraseña la primera vez que entres.
6. Sube las fotos y páginas privadas (están en `media/`, fuera de git):
   `npm run upload-media` y entra con tu usuario de administrador.
7. Authentication → URL Configuration: añade `https://siscu30.github.io/NutriPlan/`
   como Site URL y Redirect URL (para los correos de recuperar contraseña).
8. Lua entra en la web → «Pedir acceso». Tú la apruebas en Planes y ajustes → Accesos
   y marcas que vea los dos planes.

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

## Sincronización (opcional)

1. Crear un proyecto gratuito en supabase.com.
2. Ejecutar `supabase/plato.sql` en el SQL Editor.
3. En la app: Planes y ajustes → Sincronización → pegar URL y clave anon → Crear código → Conectar.
4. Compartir el enlace de vinculación con el otro dispositivo.

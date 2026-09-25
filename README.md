# Agenda: demos de agenda en línea para negocios locales

Una agenda profesional (citas, recordatorios por WhatsApp, reservas en línea y reportes) pensada para **mostrarse como demo personalizado** a cada prospecto: veterinarias, nail spas, barberías, consultorios, clínicas dentales/ortodoncia, spas, salones, estudios fitness o cualquier negocio con citas.

Cada demo lleva el nombre, colores, tipografía, servicios, equipo y vocabulario del giro (por ejemplo "Tutores" y "Mascotas" en veterinaria, o "Pacientes" en consultorio). Además trae **datos de ejemplo que siempre están al día de hoy**, así que la agenda nunca se ve vacía ni vieja.

---

## Cómo crear un demo para un prospecto (sin programar)

### Opción A: desde el Estudio (1 minuto, recomendado)

1. Abre la página principal del sitio (sin nada después de la dirección).
2. Elige el giro, escribe el nombre del negocio, el nombre del dueño ("Preparado para"), teléfono, Instagram y, si quieres, pega la URL de su logo.
3. Elige su color de marca, modo claro/oscuro y tipografía. A la derecha ves la vista previa en vivo.
4. Pulsa **"Copiar enlace para enviar"**. Ese enlace ya contiene todo: mándalo por WhatsApp o correo.

> Tip para el logo: en Instagram o Google, clic derecho sobre el logo → "Copiar dirección de imagen".

### Opción B: guardarlo como archivo (para demos que quieras conservar)

1. En el Estudio pulsa **"Copiar como archivo"**.
2. Crea un archivo nuevo en `src/clientes/` (por ejemplo `src/clientes/barberia-el-rey.ts`) y pega el contenido.
3. Publica el sitio. El demo queda en: `https://TU-DOMINIO/?c=barberia-el-rey`

Hay una plantilla comentada en `src/clientes/_plantilla.ts` y cinco ejemplos listos:
`?c=huellitas` (veterinaria) · `?c=barberia-santa-fe` (barbería) · `?c=valentina-nails` (nail spa) · `?c=olmos-ortodoncia` (dental) · `?c=northside` (consultorio, en inglés).

### Durante la reunión con el prospecto

- Botón **"Personalizar demo"** (abajo a la izquierda): cambia en vivo nombre, giro, color, modo oscuro, tipografía y esquinas.
- **Reserva en línea**: muestra en un teléfono cómo reservan sus clientes. Haz una reserva en vivo y aparece al instante en la agenda.
- Los cambios se guardan en el navegador de quien abre el demo. **Ajustes → Reiniciar datos del demo** lo deja como nuevo.

---

## Qué incluye

| Área | Funciones |
|---|---|
| **Hoy** | Saludo personalizado, próxima cita con cuenta regresiva, ingresos del día, ocupación, carga de la semana, citas por confirmar (recordatorio por WhatsApp en un clic) y lista de espera |
| **Agenda** | Vistas día (columna por profesional), semana, mes y lista · arrastrar y soltar para mover · estirar para cambiar duración · clic en un espacio vacío para agendar · línea de "ahora" · horarios, descansos y bloqueos sombreados |
| **Citas** | Horarios libres sugeridos, "cualquier profesional disponible", aviso de cruces y fuera de horario, citas recurrentes, estados (por confirmar, confirmada, en sala, completada, no asistió, cancelada), pagada, canal, notas y mascota |
| **Clientes** | Búsqueda, filtros (VIP, sin volver +60 días), historial, total gastado, inasistencias, notas, mascotas, agendar de nuevo en un clic |
| **Servicios / Equipo** | Duración, precio, tiempo de preparación, color, reservable en línea · horario propio por profesional, servicios que realiza, bloqueos (vacaciones, capacitación) |
| **Reportes** | Ingresos por día, servicios más vendidos, ingresos por profesional, canal de reserva, horas más ocupadas y mejores clientes (7/30/90 días) |
| **Reserva en línea** | Flujo móvil de 4 pasos con la marca del negocio, confirmación, agregar al calendario (.ics) y WhatsApp |
| **Extras** | Español/inglés, 17 monedas con precios convertidos, formato 12/24 h, modo oscuro, búsqueda global (Ctrl+K), deshacer (Ctrl+Z), atajos de teclado, imprimir, respaldo JSON y exportar a CSV, adaptado a celular |

**Atajos:** `N` nueva cita · `T` hoy · `D/W/M/L` vistas · `← →` navegar · `/` o `Ctrl+K` buscar · `Ctrl+Z` deshacer.

---

## Para el desarrollador

Hecho con **TypeScript + React + Vite**. No usa servidor: el resultado es una carpeta de archivos estáticos (`dist/`) que se sube a cualquier hosting (Vercel, Netlify, cPanel, GitHub Pages).

```bash
npm install
npm run dev        # servidor local en http://localhost:5173
npm test           # pruebas del motor de disponibilidad y de los datos demo
npm run build      # genera dist/ listo para publicar
```

**Estructura**

```
src/
  clientes/          ← un archivo por prospecto (DemoConfig)
  config/presets.ts  ← giros: servicios, equipo, colores, tipografías, vocabulario
  config/seed.ts     ← genera clientes y citas realistas relativos a hoy
  config/registry.ts ← decide qué demo abrir (?c=slug · ?d=enlace · Estudio)
  lib/availability.ts← motor de horarios libres, cruces y ocupación (con pruebas)
  store/             ← estado, persistencia en el navegador y "deshacer"
  views/             ← Hoy, Agenda, Clientes, Servicios, Equipo, Reportes, Reserva, Ajustes, Estudio
```

**Pasar de demo a producto real:** los datos viven en `localStorage` (`src/store/store.ts`). Para que la reserva en línea llegue a la agenda del negocio desde otros dispositivos, sustituye `initStore`, `persist` y `update` por llamadas a una base de datos (Supabase, Firebase o una API propia). Nada más en la app necesita cambiar.

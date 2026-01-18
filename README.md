# MicroEstado: Mandato y Milagros

Copyright (c) 2026 Natalia Jaimes. All rights reserved.

**El código se publica bajo PolyForm Strict 1.0.0: no redistribución, no modificaciones, no uso comercial.**

Juego idle/incremental minimalista con tono satirico sobre un micro-pais ficticio.

## Estructura
- `backend/` Node.js + TypeScript (Express) + SQLite
- `frontend/` React + Vite + TypeScript + Tailwind
- `shared/` datos JSON (roles, tipos de estado, industrias, proyectos, eventos, economia, presets, iap, remote config)

## Requisitos
- Node.js 18+
- npm

## Configuracion
1) Instala dependencias:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

2) Backend env:

```bash
cp backend/.env.example backend/.env
```

3) Ejecuta todo:

```bash
npm run dev
```

- Backend: http://localhost:8787
- Frontend: http://localhost:5173

## Scripts
- `npm run dev` - levanta backend y frontend
- `npm run build` - compila backend y frontend
- `npm run lint` - eslint en backend y frontend

## Que se arreglo (pantalla en blanco)
- Proxy Vite para /api con changeOrigin.
- Validacion de JSON en fetch y cache no-store en /api/config.
- /game con estados de loading y error, mas retry.
- ErrorBoundary global para crashes visibles.
- Dev tools opcionales: `VITE_DEV_TOOLS=true` para Rescue/Reset.
- Derrocamiento (game over) con alertas de riesgo y modal final.

## Como validar (pasos)
1) `npm run dev`
2) Login -> redirige a /game y muestra "Cargando juego..." 1-2s.
3) Network: /api/config y /api/save responden JSON (no HTML).
4) Apaga backend y recarga /game: aparece error con boton Reintentar.
5) Forza token invalido y recarga /game: redirige a /login.
6) Abre Ajustes/Monetizacion: se ve X, ESC y click en overlay cierran, click dentro no cierra.
7) Al cerrar un modal, el scroll vuelve y el foco regresa al boton que lo abrio.
8) Verificacion anti-softlock: nueva partida con impuestos HIGH sube tesoro en <5s y permite iniciar un proyecto <60s.
9) Riesgo de derrocamiento: al degradar felicidad/estabilidad/confianza aparece banner y countdown.

## Como forzar derrocamiento (test)
1) Ejecuta con `VITE_DEV_TOOLS=true`.
2) En Ajustes -> Debug / Rescue -> Reset partida.
3) Impuestos HIGH, presupuesto: Bienestar 0%, Seguridad 80%, Industria 20%.
4) Deja correr 60-90s: deberias ver riesgo alto, countdown y modal "DERROCADO".

## Dev Tools
- `VITE_DEV_TOOLS=true` habilita botones en Ajustes: "Rescue: +200 Tesoro" y "Reset partida".
- Reset partida crea una nueva partida con el mismo pais/lider/preset.

## MVP recomendado (6-8 semanas)
- Crear lider (azar + manual) con mandato generado.
- Fase 1 completa + 10 proyectos iniciales.
- 6-8 eventos del set base.
- Guardado + progreso offline.
- Remote Config conectado con overrides en dev.
- Rewarded ads (simulado) + 4 IAP (simulado).

## Checklist manual rapido
1) Registro y login funcionan y entregan token.
2) Onboarding pais exige nombre.
3) Onboarding lider exige nombre, genero y si es "Otro" pide especificar. Rol seleccionable o aleatorio.
4) Mandato generado asigna rol, rasgo y tagline satirico.
5) Preset elegido crea partida y entra al juego.
6) Se ven metricas principales y panel de detalles muestra secundarias.
7) Impuestos y presupuesto ajustan sliders sin romper el total 100.
8) Industria lider se puede seleccionar y diversificar desde fase 2.
9) Proyectos se pueden iniciar y completan con efectos (incluye adminCapacity).
10) Eventos aparecen y opciones aplican efectos; mitigacion con token funciona.
11) Plan anticrisis se desbloquea y respeta cooldown.
12) Guardado local cada 10s, sync backend cada 30s, boton "Guardar ahora".
13) Remote Config overrides aplican cambios (dev).
14) IAP y rewarded simulados actualizan tokens/efectos.
15) Titulos de rol se ajustan al genero y noticias usan nombre del lider.
16) Tipo de Estado es dropdown con "(Sin especificar)" y "Otro (especificar)".
17) Preview del nombre formal del pais funciona.
18) Derrocamiento: banner de riesgo y modal final con reintentar/reset.

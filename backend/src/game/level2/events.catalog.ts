import type { InflationRegime, Level2Effects } from "./utils.js";

export interface Level2EventDef {
  id: string;
  title: string;
  body: string;
  weight: number;
  minPhase: 1 | 2 | 3 | 4;
  requires?: {
    regimesAny?: string[];
    inflationRegimesAny?: InflationRegime[];
    industryTagsAny?: string[];
  };
  options: Array<{
    id: string;
    label: string;
    hint?: string;
    outcome?: string;
    effects: Level2Effects;
  }>;
}

export const Level2EventsCatalog: Level2EventDef[] = [
  {
    id: "L2_DROUGHT",
    title: "Sequia",
    body: "La lluvia se fue a otra agenda y el campo acusa el golpe.",
    weight: 1.2,
    minPhase: 1,
    requires: { industryTagsAny: ["agro", "food", "rural"] },
    options: [
      {
        id: "IRRIGATION",
        label: "Invertir en riego",
        hint: "Alto costo, mejora agua y estabilidad.",
        outcome: "Los canales aparecen en tiempo record.",
        effects: { treasury: -120, water: 15, stability: 3, happiness: 2 }
      },
      {
        id: "IMPORT_FOOD",
        label: "Importar alimentos",
        hint: "Endeuda, calma estomagos.",
        outcome: "Los barcos llegan con cajas sin marca.",
        effects: { debt: 150, treasury: -30, happiness: 4, reputation: -1 }
      },
      {
        id: "PRAY",
        label: "Rezar y esperar",
        hint: "Barato, incierto.",
        outcome: "Se organiza una cadena de rezos oficiales.",
        effects: { stability: -4, happiness: -3, inflationPct: 0.1 }
      }
    ]
  },
  {
    id: "L2_CROP_PEST",
    title: "Plaga agricola",
    body: "Una plaga decide comer gratis.",
    weight: 1,
    minPhase: 1,
    requires: { industryTagsAny: ["agro", "food", "rural"] },
    options: [
      {
        id: "FUMIGATE",
        label: "Fumigar masivo",
        hint: "Rapido pero contamina.",
        outcome: "Se fumiga hasta el viento.",
        effects: { treasury: -70, envFootprint: 8, jobs: 2 }
      },
      {
        id: "BIO_CONTROL",
        label: "Control biologico",
        hint: "Mas lento, mejora reputacion.",
        outcome: "Se liberan insectos con contrato.",
        effects: { treasury: -40, reputation: 3, innovation: 2 }
      },
      {
        id: "DENY",
        label: "Negar en TV",
        hint: "Nadie ve las hojas mordidas.",
        outcome: "El portavoz anuncia que es un efecto optico.",
        effects: { institutionalTrust: -4, corruption: 2 }
      }
    ]
  },
  {
    id: "L2_FISHING_BAN",
    title: "Veda inesperada",
    body: "Los cardumenes no responden a decretos.",
    weight: 1,
    minPhase: 1,
    requires: { industryTagsAny: ["ocean", "ports", "tourism"] },
    options: [
      {
        id: "SUBSIDY",
        label: "Subsidio a pescadores",
        hint: "Calma social, costo fiscal.",
        outcome: "Los muelles cantan victoria.",
        effects: { treasury: -60, happiness: 4, jobs: 3 }
      },
      {
        id: "LOOK_AWAY",
        label: "Hacer vista gorda",
        hint: "Riesgo ambiental.",
        outcome: "Se pesca de noche con linternas.",
        effects: { corruption: 4, envFootprint: 6, reputation: -3 }
      },
      {
        id: "RETRAIN",
        label: "Reconversion laboral",
        hint: "Mas lento, mejora innovacion.",
        outcome: "Cursos express con olor a sal.",
        effects: { treasury: -50, innovation: 3, jobs: 1 }
      }
    ]
  },
  {
    id: "L2_ALGAL_BLOOM",
    title: "Floracion algal",
    body: "El mar se tiñe y sube el olor a titulares.",
    weight: 0.9,
    minPhase: 2,
    requires: { industryTagsAny: ["ocean", "ports", "tourism"] },
    options: [
      {
        id: "MONITOR",
        label: "Monitoreo y contencion",
        hint: "Costoso, evita crisis.",
        outcome: "Se despliegan drones y pancartas.",
        effects: { treasury: -80, stability: 2, reputation: 2 }
      },
      {
        id: "FAST_HARVEST",
        label: "Acelerar cosecha",
        hint: "Caja hoy, ambiente manana.",
        outcome: "Se sella un acuerdo con olor a prisa.",
        effects: { treasury: 50, envFootprint: 5, corruption: 2 }
      },
      {
        id: "TEMP_CLOSE",
        label: "Cerrar temporalmente",
        hint: "Menos ingresos, mas reputacion.",
        outcome: "Se coloca un cartel de cerrado por salud.",
        effects: { treasury: -40, happiness: -2, reputation: 3 }
      }
    ]
  },
  {
    id: "L2_FOREST_FIRES",
    title: "Incendios forestales",
    body: "El humo domina la portada del dia.",
    weight: 1,
    minPhase: 1,
    requires: { industryTagsAny: ["rural", "green"] },
    options: [
      {
        id: "BRIGADES",
        label: "Brigadas y prevencion",
        hint: "Protege reputacion.",
        outcome: "Se compra agua hasta en latas.",
        effects: { treasury: -90, stability: 2, reputation: 2, envFootprint: -5 }
      },
      {
        id: "LET_BURN",
        label: "Dejar que arda",
        hint: "Costo cero, costo politico.",
        outcome: "Se anuncia que es un ciclo natural.",
        effects: { stability: -6, happiness: -4, reputation: -4 }
      },
      {
        id: "BLAME_NEIGHBOR",
        label: "Culpar al vecino",
        hint: "Narrativa conveniente.",
        outcome: "Se imprime un mapa con flechas.",
        effects: { institutionalTrust: -3, stability: -2 }
      }
    ]
  },
  {
    id: "L2_MINE_ACCIDENT",
    title: "Accidente en faena",
    body: "Un accidente en el sector industrial desata protestas.",
    weight: 0.9,
    minPhase: 2,
    requires: { industryTagsAny: ["industry", "exports"] },
    options: [
      {
        id: "INVESTIGATE",
        label: "Investigar y sancionar",
        hint: "Mejora confianza.",
        outcome: "Se abren carpetas con polvo.",
        effects: { corruption: -4, institutionalTrust: 3, treasury: -40 }
      },
      {
        id: "COVER",
        label: "Encubrir",
        hint: "Riesgo reputacional.",
        outcome: "El vocero repite la misma frase.",
        effects: { corruption: 6, institutionalTrust: -5, reputation: -4, treasury: 20 }
      },
      {
        id: "MODERNIZE",
        label: "Modernizar seguridad",
        hint: "Inversion alta, mejora empleo.",
        outcome: "Se anuncian cascos con sensores.",
        effects: { treasury: -110, stability: 2, jobs: 2 }
      }
    ]
  },
  {
    id: "L2_COMMODITY_BOOM",
    title: "Boom de commodities",
    body: "El mercado internacional paga en modo fiesta.",
    weight: 0.9,
    minPhase: 2,
    requires: { industryTagsAny: ["industry", "exports", "energy"] },
    options: [
      {
        id: "SOVEREIGN_FUND",
        label: "Fondo soberano",
        hint: "Ahorra para la resaca.",
        outcome: "Se inaugura una cuenta con nombre elegante.",
        effects: { treasury: 120, inflationPct: -0.2, stability: 2 }
      },
      {
        id: "POPULAR_SPEND",
        label: "Gastar en popularidad",
        hint: "Sube felicidad, sube inflacion.",
        outcome: "Se reparten bonos con selfie.",
        effects: { treasury: 80, happiness: 6, inflationPct: 0.3 }
      },
      {
        id: "ELITE_TAX_CUT",
        label: "Bajar impuestos a elites",
        hint: "Mejora caja a futuro.",
        outcome: "La elite aplaude con discrecion.",
        effects: { reputation: -3, inequality: 6, corruption: 2 }
      }
    ]
  },
  {
    id: "L2_OIL_SPILL",
    title: "Derrame ambiental",
    body: "Un derrame complica la costa y los titulares.",
    weight: 0.8,
    minPhase: 3,
    requires: { industryTagsAny: ["energy", "ports", "ocean"] },
    options: [
      {
        id: "CLEANUP",
        label: "Limpieza inmediata",
        hint: "Costosa, reputacion arriba.",
        outcome: "Se despliega espuma y discurso.",
        effects: { treasury: -160, reputation: 2, envFootprint: -10 }
      },
      {
        id: "MINIMIZE",
        label: "Minimizar y seguir",
        hint: "Barato, reputacion abajo.",
        outcome: "Se declara que fue una mancha menor.",
        effects: { reputation: -6, corruption: 4, envFootprint: 8 }
      },
      {
        id: "COMPENSATE",
        label: "Compensar comunidades",
        hint: "Mejora confianza local.",
        outcome: "Se firma un acuerdo con aplausos y barro.",
        effects: { treasury: -90, happiness: 3, institutionalTrust: 2 }
      }
    ]
  },
  {
    id: "L2_BLACKOUT",
    title: "Corte electrico",
    body: "La red no aguanta el pico y se apagan barrios.",
    weight: 1.1,
    minPhase: 1,
    requires: { industryTagsAny: ["energy", "grid", "industry", "services"] },
    options: [
      {
        id: "INVEST_GRID",
        label: "Invertir en red",
        hint: "Caro, mejora energia.",
        outcome: "Se promete cableado digno.",
        effects: { treasury: -120, energy: 12, stability: 2 }
      },
      {
        id: "RATION",
        label: "Racionamiento",
        hint: "Impopular, evita colapso.",
        outcome: "Se publica un calendario de apagones.",
        effects: { happiness: -3, stability: 1, inflationPct: 0.1 }
      },
      {
        id: "BLAME_RAIN",
        label: "Culpar a la lluvia",
        hint: "Narrativa facil.",
        outcome: "Se declara un fenomeno meteorologico inesperado.",
        effects: { institutionalTrust: -2 }
      }
    ]
  },
  {
    id: "L2_WATER_SANITATION_BREAK",
    title: "Falla de saneamiento",
    body: "Una planta clave se detiene y sube el olor.",
    weight: 0.9,
    minPhase: 2,
    requires: { industryTagsAny: ["infra", "rural", "services"] },
    options: [
      {
        id: "URGENT_REPAIR",
        label: "Reparacion urgente",
        hint: "Recupera agua y confianza.",
        outcome: "Se trabaja 24/7 con casco y termo.",
        effects: { treasury: -90, water: 10, happiness: 2 }
      },
      {
        id: "CHEAP_PATCH",
        label: "Parche barato",
        hint: "Apenas mejora.",
        outcome: "Se pega cinta y se reza.",
        effects: { treasury: -30, water: 3, stability: -1 }
      },
      {
        id: "DO_NOTHING",
        label: "No hacer nada",
        hint: "Ahorro hoy, costo manana.",
        outcome: "Se recomienda hervir el agua.",
        effects: { happiness: -4, institutionalTrust: -3 }
      }
    ]
  },
  {
    id: "L2_FACTORY_SAFETY",
    title: "Accidente industrial",
    body: "Una fabrica aparece en primera plana.",
    weight: 1,
    minPhase: 2,
    requires: { industryTagsAny: ["industry", "automation"] },
    options: [
      {
        id: "STRICT_RULES",
        label: "Normas estrictas",
        hint: "Sube reputacion.",
        outcome: "Se publican manuales con sello oficial.",
        effects: { treasury: -60, corruption: -2, reputation: 2 }
      },
      {
        id: "FLEX",
        label: "Flexibilizar",
        hint: "Mejora caja, baja estabilidad.",
        outcome: "Se reduce el papeleo con aplausos.",
        effects: { treasury: 30, corruption: 3, stability: -2 }
      },
      {
        id: "AUTOMATE",
        label: "Automatizar",
        hint: "Innovacion alta, empleo baja.",
        outcome: "Llegan robots con horarios perfectos.",
        effects: { innovation: 4, jobs: -4, treasury: -40 }
      }
    ]
  },
  {
    id: "L2_PORT_STRIKE",
    title: "Huelga portuaria",
    body: "Los puertos frenan y la cadena tiembla.",
    weight: 0.9,
    minPhase: 2,
    requires: { industryTagsAny: ["ports", "trade", "exports"] },
    options: [
      {
        id: "NEGOTIATE",
        label: "Negociar",
        hint: "Costo moderado, baja tension.",
        outcome: "Se firma un acuerdo con cafe frio.",
        effects: { treasury: -50, happiness: 2, stability: 1 }
      },
      {
        id: "CRACKDOWN",
        label: "Reprimir",
        hint: "Sube estabilidad, cae reputacion.",
        outcome: "Se anuncia orden con casco y sirena.",
        effects: { stability: 3, reputation: -5, institutionalTrust: -3 }
      },
      {
        id: "AIR_ROUTE",
        label: "Desviar por aire",
        hint: "Caro, evita quiebre.",
        outcome: "Se alquilan aviones de ultimo minuto.",
        effects: { treasury: -90, inflationPct: 0.1 }
      }
    ]
  },
  {
    id: "L2_ROAD_BLOCKADE",
    title: "Bloqueo de carreteras",
    body: "Camiones detenidos y cadenas tensas.",
    weight: 1,
    minPhase: 1,
    requires: { industryTagsAny: ["infra", "trade", "transport"] },
    options: [
      {
        id: "PUBLIC_WORKS",
        label: "Obras express",
        hint: "Caro, genera empleo.",
        outcome: "Se inaugura una obra con cinta.",
        effects: { treasury: -120, stability: 2, jobs: 2 }
      },
      {
        id: "DIALOGUE",
        label: "Dialogo",
        hint: "Mejora confianza.",
        outcome: "Se instala una mesa con mate.",
        effects: { treasury: -40, institutionalTrust: 2 }
      },
      {
        id: "IGNORE",
        label: "Ignorar",
        hint: "Ahorro hoy, ruido manana.",
        outcome: "Se declara que es algo menor.",
        effects: { stability: -3, happiness: -2 }
      }
    ]
  },
  {
    id: "L2_TOURISM_BOOM",
    title: "Boom turistico",
    body: "Llegan visitantes y suben los precios.",
    weight: 0.9,
    minPhase: 2,
    requires: { industryTagsAny: ["tourism", "heritage", "creative"] },
    options: [
      {
        id: "INVEST_HOSPITALITY",
        label: "Invertir en hospitality",
        hint: "Sube reputacion, costo alto.",
        outcome: "Se anuncia una ruta premium.",
        effects: { treasury: -40, happiness: 3, reputation: 2 }
      },
      {
        id: "LET_FLOW",
        label: "Dejar organico",
        hint: "Ingreso rapido.",
        outcome: "Se deja que el mercado haga magia.",
        effects: { treasury: 30, reputation: 1 }
      },
      {
        id: "TOURIST_FEE",
        label: "Cobrar tasa turista",
        hint: "Caja extra, reputacion baja.",
        outcome: "Se imprime la tasa en folletos.",
        effects: { treasury: 70, reputation: -2 }
      }
    ]
  },
  {
    id: "L2_TOURISM_BACKLASH",
    title: "Saturacion turistica",
    body: "Los residentes piden respiro.",
    weight: 0.8,
    minPhase: 3,
    requires: { industryTagsAny: ["tourism", "heritage", "creative"] },
    options: [
      {
        id: "REGULATE",
        label: "Regular aforo",
        hint: "Equilibrio social.",
        outcome: "Se limitan buses con sonrisa.",
        effects: { treasury: -30, reputation: 2, happiness: 1 }
      },
      {
        id: "SQUEEZE",
        label: "Exprimirlo",
        hint: "Caja alta, impacto ambiental.",
        outcome: "Se anuncia temporada sin fin.",
        effects: { treasury: 90, envFootprint: 6, inequality: 3 }
      },
      {
        id: "CAMPAIGN",
        label: "Campana 'ven igual'",
        hint: "Narrativa rara.",
        outcome: "Se lanza un spot con coreografia.",
        effects: { institutionalTrust: -1, reputation: -1 }
      }
    ]
  },
  {
    id: "L2_CORRUPTION_SCANDAL",
    title: "Escandalo de corrupcion",
    body: "Un audio filtrado prende la mecha.",
    weight: 1.3,
    minPhase: 1,
    options: [
      {
        id: "INVESTIGATE",
        label: "Investigar",
        hint: "Mejora confianza, costo politico.",
        outcome: "Se abren sumarios con aplausos tibios.",
        effects: { corruption: -6, institutionalTrust: 3, stability: -1, treasury: -40 }
      },
      {
        id: "COVER_UP",
        label: "Encubrir",
        hint: "Riesgo alto.",
        outcome: "Se pierde un expediente clave.",
        effects: { corruption: 8, institutionalTrust: -6, reputation: -3 }
      },
      {
        id: "SCAPEGOAT",
        label: "Chivo expiatorio",
        hint: "Parche rapido.",
        outcome: "Se entrega un responsable de utileria.",
        effects: { corruption: -2, institutionalTrust: -2, stability: 1 }
      }
    ]
  },
  {
    id: "L2_FOREIGN_INVEST_OFFER",
    title: "Oferta de inversion extranjera",
    body: "Un fondo llega con promesas y logo brillante.",
    weight: 1,
    minPhase: 2,
    options: [
      {
        id: "ACCEPT_FAST",
        label: "Aceptar rapido",
        hint: "Caja alta, desigualdad.",
        outcome: "Se firma en servilleta.",
        effects: { treasury: 120, inequality: 5, reputation: -1 }
      },
      {
        id: "NEGOTIATE",
        label: "Negociar",
        hint: "Mejor reputacion.",
        outcome: "Se negocia con cafe y traductor.",
        effects: { treasury: 70, reputation: 2, corruption: -1 }
      },
      {
        id: "REJECT",
        label: "Rechazar por soberania",
        hint: "Coste politico.",
        outcome: "Se emite un comunicado patriota.",
        effects: { reputation: 1, treasury: -20 }
      }
    ]
  },
  {
    id: "L2_PROTESTS",
    title: "Protestas",
    body: "La calle se llena de pancartas.",
    weight: 1.2,
    minPhase: 1,
    options: [
      {
        id: "DIALOGUE_BONUS",
        label: "Dialogo y bonos",
        hint: "Sube felicidad, cuesta tesoro.",
        outcome: "Se abre mesa y cheque rapido.",
        effects: { treasury: -90, happiness: 4, institutionalTrust: 2 }
      },
      {
        id: "REPRESS",
        label: "Represion",
        hint: "Estabilidad corta, reputacion baja.",
        outcome: "Se declara orden con sirenas.",
        effects: { stability: 4, reputation: -6, happiness: -4 }
      },
      {
        id: "MEME_PR",
        label: "PR y memes",
        hint: "Absurdo, leve efecto.",
        outcome: "Se lanza un hashtag oficial.",
        effects: { treasury: -30, institutionalTrust: -1, happiness: 1 }
      }
    ]
  },
  {
    id: "L2_INFLATION_CRISIS",
    title: "Crisis inflacionaria",
    body: "Los precios corren mas rapido que los salarios.",
    weight: 1,
    minPhase: 1,
    requires: { inflationRegimesAny: ["HIGH", "HYPER"] },
    options: [
      {
        id: "RAISE_RATES",
        label: "Subir tasas",
        hint: "Baja inflacion, frena crecimiento.",
        outcome: "El banco central se pone serio.",
        effects: { inflationPct: -0.6, stability: 1, growthPct: -0.1 }
      },
      {
        id: "PRINT",
        label: "Imprimir dinero",
        hint: "Caja rapida, mas inflacion.",
        outcome: "Se enciende la imprenta de noche.",
        effects: { treasury: 120, inflationPct: 0.8, institutionalTrust: -2 }
      },
      {
        id: "PRICE_PACT",
        label: "Pacto de precios",
        hint: "Control parcial, riesgo corrupcion.",
        outcome: "Se firma un acuerdo con sonrisas tensas.",
        effects: { inflationPct: -0.2, corruption: 2, treasury: -40 }
      }
    ]
  },
  {
    id: "L2_TRADE_SANCTION",
    title: "Sancion comercial",
    body: "Un socio cierra puertas de golpe.",
    weight: 0.8,
    minPhase: 3,
    requires: { industryTagsAny: ["trade", "ports", "exports"] },
    options: [
      {
        id: "ADJUST_POLICY",
        label: "Ajustar politica",
        hint: "Recupera reputacion.",
        outcome: "Se anuncia un paquete diplomativo.",
        effects: { reputation: 2, institutionalTrust: 1, treasury: -60 }
      },
      {
        id: "RESIST",
        label: "Resistir",
        hint: "Mas estabilidad, menos caja.",
        outcome: "Se declara resistencia comercial.",
        effects: { treasury: -90, stability: -2, reputation: -2 }
      },
      {
        id: "NEW_MARKETS",
        label: "Buscar nuevos mercados",
        hint: "Innovation y reputacion.",
        outcome: "Se inicia gira relampago.",
        effects: { treasury: -70, innovation: 2, reputation: 1 }
      }
    ]
  },
  {
    id: "L2_RESOURCE_DISCOVERY",
    title: "Descubrimiento de recursos",
    body: "Un informe promete riqueza subterranea.",
    weight: 0.9,
    minPhase: 2,
    requires: { industryTagsAny: ["industry", "exports"] },
    options: [
      {
        id: "EXPLOIT",
        label: "Explotar",
        hint: "Caja alta, impacto ambiental.",
        outcome: "Se aprueba una licencia express.",
        effects: { treasury: 200, envFootprint: 8, reputation: -3, corruption: 2 }
      },
      {
        id: "RESERVE",
        label: "Reservar",
        hint: "Reputacion mejora.",
        outcome: "Se declara zona protegida.",
        effects: { reputation: 4, treasury: 20 }
      },
      {
        id: "FRIENDS",
        label: "Concesion a amigos",
        hint: "Caja rapida, baja confianza.",
        outcome: "Se firma un contrato sin licitacion.",
        effects: { treasury: 140, corruption: 6, institutionalTrust: -3 }
      }
    ]
  },
  {
    id: "L2_MIGRATION_WAVE",
    title: "Migracion repentina",
    body: "Llega una ola de personas buscando trabajo.",
    weight: 1,
    minPhase: 2,
    options: [
      {
        id: "INTEGRATE",
        label: "Integrar",
        hint: "Mejora empleo, sube desigualdad.",
        outcome: "Se lanza un plan de integracion.",
        effects: { jobs: 5, happiness: 2, inequality: 1 }
      },
      {
        id: "CLOSE",
        label: "Cerrar fronteras",
        hint: "Estabilidad, reputacion baja.",
        outcome: "Se refuerzan controles con pancartas.",
        effects: { stability: 2, reputation: -3, treasury: -20 }
      },
      {
        id: "TEMP_PROGRAM",
        label: "Programa temporal",
        hint: "Costo moderado.",
        outcome: "Se habilita un permiso exprés.",
        effects: { treasury: -50, jobs: 3, institutionalTrust: 1 }
      }
    ]
  },
  {
    id: "L2_CYBER_INCIDENT",
    title: "Ciberincidente",
    body: "Un ataque digital paraliza servicios clave.",
    weight: 1,
    minPhase: 2,
    requires: { industryTagsAny: ["software", "finance", "cyber"] },
    options: [
      {
        id: "RESILIENCE",
        label: "Invertir resiliencia",
        hint: "Caro, mejora innovacion.",
        outcome: "Se contrata un equipo con camisetas negras.",
        effects: { treasury: -120, innovation: 4, stability: 1 }
      },
      {
        id: "PATCH",
        label: "Parche rapido",
        hint: "Solucion temporal.",
        outcome: "Se reinician servidores sin anuncio.",
        effects: { treasury: -30, innovation: 1, institutionalTrust: -1 }
      },
      {
        id: "BLAME_INTERN",
        label: "Culpar al becario",
        hint: "Riesgo reputacional.",
        outcome: "Se entrega un culpable con credencial.",
        effects: { institutionalTrust: -2, happiness: -1 }
      }
    ]
  },
  {
    id: "L2_COALITION_BREAKS",
    title: "Coalicion se rompe",
    body: "Los socios de gobierno se pelean en publico.",
    weight: 0.9,
    minPhase: 2,
    requires: { regimesAny: ["PRIME_MINISTER", "CHANCELLOR"] },
    options: [
      {
        id: "NEGOTIATE",
        label: "Negociar",
        hint: "Calma politica.",
        outcome: "Se firma un acuerdo con cafe frio.",
        effects: { treasury: -40, institutionalTrust: 2, stability: 1 }
      },
      {
        id: "CALL_ELECTIONS",
        label: "Llamar a elecciones",
        hint: "Activa el proceso electoral.",
        outcome: "Se activa la campaña en tiempo record.",
        effects: { treasury: -100 }
      },
      {
        id: "MINORITY",
        label: "Gobierno minoria",
        hint: "Riesgo de estabilidad.",
        outcome: "Se gobierna con calculadora.",
        effects: { stability: -2, corruption: 1 }
      }
    ]
  },
  {
    id: "L2_MEDIA_SCANDAL_ABSURD",
    title: "Escandalo mediatico absurdo",
    body: "Una noticia ridicula se vuelve viral.",
    weight: 1.1,
    minPhase: 1,
    options: [
      {
        id: "PR_SPEND",
        label: "Gastar en PR",
        hint: "Compra titulares.",
        outcome: "Se contrata un equipo de crisis.",
        effects: { treasury: -40, reputation: 2 }
      },
      {
        id: "IGNORE",
        label: "Ignorar",
        hint: "Deja pasar la ola.",
        outcome: "Se finge demencia colectiva.",
        effects: { reputation: -1, institutionalTrust: 1 }
      },
      {
        id: "DANCE",
        label: "Responder con baile",
        hint: "Sorpresa total.",
        outcome: "Se viraliza un video oficial.",
        effects: { happiness: 2, institutionalTrust: -1 }
      }
    ]
  },
  {
    id: "L2_GENERAL_STRIKE",
    title: "Huelga general",
    body: "La produccion se detiene y sube la tension.",
    weight: 0.9,
    minPhase: 2,
    requires: { industryTagsAny: ["industry", "services", "infra"] },
    options: [
      {
        id: "RAISE_WAGES",
        label: "Subir salarios",
        hint: "Mejora felicidad, sube inflacion.",
        outcome: "Se firma un acuerdo salarial.",
        effects: { treasury: -110, happiness: 4, inflationPct: 0.2 }
      },
      {
        id: "AUTOMATE",
        label: "Automatizar",
        hint: "Innovacion arriba, empleo abajo.",
        outcome: "Se anuncian robots en cadena.",
        effects: { innovation: 5, jobs: -6, happiness: -2 }
      },
      {
        id: "MEDIATE",
        label: "Mediacion",
        hint: "Estabilidad moderada.",
        outcome: "Se instala una mesa tripartita.",
        effects: { treasury: -50, stability: 2, institutionalTrust: 1 }
      }
    ]
  },
  {
    id: "L2_NEIGHBOR_TENSION",
    title: "Vecino intranquilo",
    body: "Un vecino sube el tono en la frontera.",
    weight: 0.8,
    minPhase: 3,
    requires: { industryTagsAny: ["defense", "security"] },
    options: [
      {
        id: "DIPLOMACY",
        label: "Diplomacia",
        hint: "Mejora reputacion.",
        outcome: "Se organiza una cumbre express.",
        effects: { reputation: 3, institutionalTrust: 1, treasury: -40 }
      },
      {
        id: "SECURITY_SPEND",
        label: "Gasto en seguridad",
        hint: "Estabilidad arriba.",
        outcome: "Se compran drones con moño.",
        effects: { stability: 3, treasury: -90, reputation: -2 }
      },
      {
        id: "PROVOKE",
        label: "Provocar por deporte",
        hint: "Sorpresa negativa.",
        outcome: "Se publica un mapa con emojis.",
        effects: { stability: -2, reputation: -4 }
      }
    ]
  },
  {
    id: "L2_INTERNATIONAL_PRIZE",
    title: "Premio internacional",
    body: "Un jurado extranjero felicita al pais.",
    weight: 0.9,
    minPhase: 2,
    options: [
      {
        id: "ACCEPT",
        label: "Aceptar",
        hint: "Sube reputacion.",
        outcome: "Se viaja a recoger una estatuilla.",
        effects: { reputation: 6, institutionalTrust: 2, treasury: 60 }
      },
      {
        id: "REJECT",
        label: "Rechazar por soberania",
        hint: "Postura dura.",
        outcome: "Se devuelve el premio con carta.",
        effects: { reputation: 1, happiness: 1, treasury: -10 }
      },
      {
        id: "MUSEUM",
        label: "Convertirlo en museo",
        hint: "Turismo y reputacion.",
        outcome: "Se abre un museo del premio.",
        effects: { treasury: -40, reputation: 3 }
      }
    ]
  },
  {
    id: "L2_DEFLATION_SPIRAL",
    title: "Deflacion y consumo cae",
    body: "Los precios bajan, el animo tambien.",
    weight: 0.9,
    minPhase: 2,
    requires: { inflationRegimesAny: ["DEFLATION"] },
    options: [
      {
        id: "STIMULATE",
        label: "Estimular demanda",
        hint: "Sube inflacion, sube felicidad.",
        outcome: "Se activa un plan de consumo.",
        effects: { treasury: -120, happiness: 3, inflationPct: 0.4 }
      },
      {
        id: "AUSTERITY",
        label: "Austeridad",
        hint: "Caja mejora, baja felicidad.",
        outcome: "Se anuncia tijera fiscal.",
        effects: { treasury: 40, happiness: -3, stability: -1 }
      },
      {
        id: "TARGETED_SUBSIDY",
        label: "Subsidio focalizado",
        hint: "Confianza arriba.",
        outcome: "Se crea un beneficio puntual.",
        effects: { treasury: -60, institutionalTrust: 2 }
      }
    ]
  },
  {
    id: "L2_SUPPLY_CHAIN_SHOCK",
    title: "Shock de cadena de suministro",
    body: "Faltan insumos y sube la ansiedad.",
    weight: 1,
    minPhase: 2,
    requires: { industryTagsAny: ["trade", "transport", "industry"] },
    options: [
      {
        id: "STRATEGIC_STOCK",
        label: "Stock estrategico",
        hint: "Costoso, estabilidad arriba.",
        outcome: "Se compran contenedores de emergencia.",
        effects: { treasury: -90, stability: 2 }
      },
      {
        id: "NEW_SUPPLIERS",
        label: "Buscar proveedores",
        hint: "Innovacion y reputacion.",
        outcome: "Se anuncia una ronda de negocios.",
        effects: { treasury: -60, innovation: 1, reputation: 1 }
      },
      {
        id: "BLAME_SHIPS",
        label: "Culpar a los barcos",
        hint: "Nada cambia.",
        outcome: "Se culpa a la logistica global.",
        effects: { institutionalTrust: -1, happiness: -1 }
      }
    ]
  }
];

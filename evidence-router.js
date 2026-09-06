// Local evidence routing only.
// This module never generates HEB prose. It only selects which original
// statements are relevant for a HEB section so the local language model gets
// a smaller, clearer source set.

const SUPPORT_RE = /\b(benötig\w*|brauch\w*|hilfebedarf\w*|unterstütz\w*|hilf\w*|impuls\w*|erinner\w*|aufforder\w*|angebot\w*|begleit\w*|anleit\w*|assist\w*|strukturier\w*|rückmeld\w*)\b/i;
const ACTION_RE = /\b(impuls\w*|erinner\w*|aufforder\w*|angebot\w*|gemeinsam\w*|begleit\w*|anleit\w*|hilfestell\w*|gespräch\w*|strukturier\w*|rückmeld\w*|vereinbar\w*|plan\w*|vorbereit\w*|üb\w*|motiv\w*|assist\w*)\b/i;
const GOAL_RE = /\b(ziel\w*|möchte\w*|wunsch\w*|angestrebt\w*|erhalten\w*|stabilisier\w*|weiterentwick\w*|verbesser\w*|förder\w*|künftig\w*|zukünftig\w*|soll\w*)\b/i;
const DEVELOPMENT_RE = /\b(im letzten|seit\b|früher\w*|inzwischen\w*|nun\b|zunehm\w*|abnehm\w*|mehr\b|weniger\b|verbesser\w*|verschlechter\w*|stabil\w*|entwick\w*|fortschritt\w*|rückschritt\w*|verlauf\w*)\b/i;
const FUTURE_RE = /\b(künftig\w*|zukünftig\w*|weiterhin\w*|vorgesehen\w*|geplant\w*|soll\w*|weitergeführt\w*|fortgeführt\w*)\b/i;
const PAST_ACTION_RE = /\b(wurde\w*|wurden\w*|erfolgte\w*|durchgeführt\w*|angeboten\w*|begleitet\w*|unterstützt\w*|angeleitet\w*|besprochen\w*)\b/i;
const PROVIDER_RE = /\b(fachkraft\w*|mitarbeit\w*|bezugsbetreu\w*|sozialdienst\w*|wohngruppe\w*|einrichtung\w*|betreuer\w*|betreuung\w*|arzt\w*|ärzt\w*|therapeut\w*|psycholog\w*|pflegedienst\w*|angehörig\w*|familie\w*)\b/i;

function take(units, predicate, maxUnits) {
  const selected = [];
  for (const unit of units || []) {
    if (!predicate(unit.text)) continue;
    selected.push(unit);
    if (selected.length >= maxUnits) break;
  }
  return selected;
}

function hasAction(text) {
  return ACTION_RE.test(String(text || ''));
}

function hasSupport(text) {
  return SUPPORT_RE.test(String(text || ''));
}

export function selectEvidenceForSection(units, formType, sectionMode, { maxUnits = 6 } = {}) {
  const all = Array.isArray(units) ? units : [];
  if (!all.length) return [];

  switch (sectionMode) {
    case 'current':
      // The user already selected the official HEB area. For the current
      // situation/resources the complete local description is the relevant
      // source pool; the writer still has to stay source-faithful.
      return all.slice(0, maxUnits);

    case 'support':
    case 'remainingSupport':
      return take(all, (text) => hasSupport(text), maxUnits);

    case 'goals':
      return take(all, (text) => GOAL_RE.test(String(text || '')), maxUnits);

    case 'measures':
      // For HEB A/B only concrete actions already described or explicitly
      // planned are routed here. A bare "benötigt Unterstützung" is not enough.
      return take(all, (text) => hasAction(text), maxUnits);

    case 'reflection':
      return take(all, (text) => hasAction(text) || PAST_ACTION_RE.test(String(text || '')), maxUnits);

    case 'development':
      return take(all, (text) => DEVELOPMENT_RE.test(String(text || '')), maxUnits);

    case 'furtherMeasures':
      return take(all, (text) => FUTURE_RE.test(String(text || '')) && (hasAction(text) || hasSupport(text)), maxUnits);

    case 'provider':
      return take(all, (text) => PROVIDER_RE.test(String(text || '')), maxUnits);

    default:
      return all.slice(0, maxUnits);
  }
}

export function evidenceRoutingSummary(units, formType, modes) {
  const result = {};
  for (const mode of modes || []) {
    result[mode] = selectEvidenceForSection(units, formType, mode).map((unit) => unit.id);
  }
  return result;
}

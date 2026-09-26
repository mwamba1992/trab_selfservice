// The layout a statement of appeal starts from: the facts, the grounds, and
// what the appellant asks the Board to do, as numbered paragraphs the filer
// writes over. In the language the filer is using.

const SKELETONS = {
  en: [
    '<h3>Statement of facts</h3>',
    '<ol><li><p>The appellant is … (who the appellant is and what business it carries on).</p></li>',
    '<li><p>On … the respondent issued … (the assessment or decision appealed against).</p></li>',
    '<li><p>The appellant objected on … and the respondent decided the objection on …</p></li></ol>',
    '<h3>Grounds of appeal</h3>',
    '<ol><li><p>That the respondent erred in law and in fact by …</p></li>',
    '<li><p>That …</p></li></ol>',
    '<h3>Reliefs sought</h3>',
    '<p>WHEREFORE the appellant prays that the Board:</p>',
    '<ol type="a"><li><p>allows the appeal;</p></li>',
    '<li><p>sets aside the assessment/decision of the respondent;</p></li>',
    '<li><p>orders costs of the appeal; and</p></li>',
    '<li><p>grants any other relief it deems just.</p></li></ol>',
  ],
  sw: [
    '<h3>Maelezo ya ukweli</h3>',
    '<ol><li><p>Mrufani ni … (mrufani ni nani na anafanya biashara gani).</p></li>',
    '<li><p>Tarehe … mjibu rufani alitoa … (makadirio au uamuzi unaokatiwa rufani).</p></li>',
    '<li><p>Mrufani aliweka pingamizi tarehe … na mjibu rufani aliamua pingamizi hilo tarehe …</p></li></ol>',
    '<h3>Sababu za rufani</h3>',
    '<ol><li><p>Kwamba mjibu rufani alikosea kisheria na kiukweli kwa …</p></li>',
    '<li><p>Kwamba …</p></li></ol>',
    '<h3>Nafuu zinazoombwa</h3>',
    '<p>KWA HIYO mrufani anaiomba Bodi:</p>',
    '<ol type="a"><li><p>ikubali rufani;</p></li>',
    '<li><p>itengue makadirio/uamuzi wa mjibu rufani;</p></li>',
    '<li><p>iamuru gharama za rufani; na</p></li>',
    '<li><p>itoe nafuu nyingine yoyote itakayoona inafaa.</p></li></ol>',
  ],
};

export function statementSkeleton(locale) {
  return (SKELETONS[locale] ?? SKELETONS.en).join('');
}

/** True when the filer has written something of their own over the layout. */
export function statementWritten(html, locale) {
  const text = (value) =>
    String(value ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const written = text(html);
  if (!written) return false;
  return !Object.values(SKELETONS).some((skeleton) => text(skeleton.join('')) === written) && written !== text(statementSkeleton(locale));
}

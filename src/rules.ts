/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: NSIS definitions */

/** Lowercase helper – builds a Set keyed by lowercase for O(1) lookup. */
function lowerSet(keywords: string[]): Set<string> {
	return new Set(keywords.map((k) => k.toLowerCase()));
}

/**
 * Keyword roles for indentation.
 *
 * - **open**  — printed at the *current* level, then level increases.
 * - **close** — level decreases first, then printed at the new level.
 * - **mid**   — printed one level *back* (like the opening keyword),
 *               but the level stays the same (e.g. `${Else}`, `!else`).
 * - **closeAfter** — printed at the *current* level, then level decreases
 *               (e.g. `${Break}`).
 */
export const rules = {
	/** Keywords that open a block (indent children). */
	open: lowerSet([
		'!if',
		'!ifdef',
		'!ifmacrodef',
		'!ifmacrondef',
		'!ifndef',
		'!macro',
		'${Do}',
		'${DoUntil}',
		'${DoWhile}',
		'${For}',
		'${ForEach}',
		'${If}',
		'${IfNot}',
		'${MementoSection}',
		'${MementoUnselectedSection}',
		'${Select}',
		'${Switch}',
		'${Unless}',
		'Function',
		'PageEx',
		'Section',
		'SectionGroup',
	]),

	/**
	 * Case-arm keywords — printed one level inside their parent switch/select,
	 * with their body indented one further level. They do not push/pop the
	 * indent stack, so consecutive cases naturally align and `${EndSwitch}`
	 * only needs to pop the switch itself.
	 */
	case: lowerSet(['${Case}', '${Case2}', '${Case3}', '${Case4}', '${Case5}', '${CaseElse}', '${Default}']),

	/** Keywords that close a block (dedent to the opener's level). */
	close: lowerSet([
		'!endif',
		'!macroend',
		'${EndIf}',
		'${EndSelect}',
		'${EndSwitch}',
		'${EndWhile}',
		'${Loop}',
		'${LoopUntil}',
		'${LoopWhile}',
		'${MementoSectionEnd}',
		'${Next}',
		'${While}',
		'FunctionEnd',
		'PageExEnd',
		'SectionEnd',
		'SectionGroupEnd',
	]),

	/**
	 * Mid-block keywords — printed at the *parent* level (one back),
	 * but they don't change the indentation depth.
	 *
	 * Example: `${Else}` aligns with `${If}`, and the body after it
	 * stays one level deeper.
	 */
	mid: lowerSet([
		'!else',
		'!elseif',
		'${Else}',
		'${ElseIf}',
		'${ElseIfNot}',
		'${ElseUnless}',
		'${AndIf}',
		'${AndIfNot}',
		'${AndUnless}',
		'${OrIf}',
		'${OrIfNot}',
		'${OrUnless}',
	]),

	/**
	 * Keyword printed at the *current* level, then level decreases.
	 * Used for `${Break}` — it's the last statement in a case arm.
	 */
	closeAfter: lowerSet(['${Break}']),
};

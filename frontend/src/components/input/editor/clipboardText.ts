import type {Fragment, Node as ProseMirrorNode, Slice} from '@tiptap/pm/model'

// ProseMirror's default plain text drops list markers, so a copied list loses the structure
// it had in the markdown it came from. Keep the markers so the text still reads as a list.
const ORDERED_LIST = 'orderedList'
const LIST_TYPES = ['bulletList', ORDERED_LIST, 'taskList']

export function serializeClipboardText(slice: Slice): string {
	return blockLines(slice.content, '').join('\n')
}

function blockLines(fragment: Fragment, indent: string): string[] {
	const lines: string[] = []
	fragment.forEach(node => {
		if (LIST_TYPES.includes(node.type.name)) {
			lines.push(...listLines(node, indent))
		} else {
			lines.push(indent + node.textContent)
		}
	})
	return lines
}

function listLines(list: ProseMirrorNode, indent: string): string[] {
	const ordered = list.type.name === ORDERED_LIST
	const lines: string[] = []
	let number = 1
	list.forEach(item => {
		const marker = ordered ? `${number++}. ` : '- '
		const childIndent = indent + ' '.repeat(marker.length)
		const body = blockLines(item.content, childIndent)
		if (body.length === 0) {
			body.push(childIndent)
		}
		body[0] = indent + marker + body[0].slice(childIndent.length)
		lines.push(...body)
	})
	return lines
}

// TEMPORARY diagnostic: reports kanban layout geometry through the failure message. Remove before finishing.
import {test} from '../../support/fixtures'
import {BucketFactory} from '../../factories/bucket'
import {ProjectFactory} from '../../factories/project'
import {TaskFactory} from '../../factories/task'
import {ProjectViewFactory} from '../../factories/project_view'
import {TaskBucketFactory} from '../../factories/task_buckets'

test('debug kanban layout', async ({authenticatedPage: page}) => {
	const projects = await ProjectFactory.create(1)
	await ProjectViewFactory.create(1, {id: 4, project_id: projects[0].id, view_kind: 3, bucket_configuration_mode: 1})
	const buckets = await BucketFactory.create(2, {project_view_id: 4})
	const moreBuckets = await BucketFactory.create(6, {id: (i: number) => buckets.length + i, project_view_id: 4}, false)
	const lastBucket = moreBuckets[moreBuckets.length - 1]
	const tasks = await TaskFactory.create(1, {project_id: projects[0].id})
	await TaskBucketFactory.create(1, {task_id: tasks[0].id, bucket_id: buckets[0].id, project_view_id: 4}, false)

	await page.goto('/projects/1/4')
	await page.locator(`.kanban .bucket[data-bucket-id="${lastBucket.id}"]`).waitFor({state: 'attached'})
	await page.waitForLoadState('networkidle')

	const info = await page.evaluate(() => {
		const describe = (el: Element | null) => {
			if (!el) return null
			const cs = getComputedStyle(el)
			const r = el.getBoundingClientRect()
			return {
				tag: el.tagName,
				cls: el.className && typeof el.className === 'string' ? el.className : '',
				display: cs.display,
				position: cs.position,
				overflowX: cs.overflowX,
				overflowY: cs.overflowY,
				alignItems: cs.alignItems,
				alignSelf: cs.alignSelf,
				flexDirection: cs.flexDirection,
				blockSize: cs.blockSize,
				inlineSize: cs.inlineSize,
				maxBlockSize: cs.maxBlockSize,
				rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
			}
		}
		const kanban = document.querySelector('.kanban')
		const bucket = document.querySelector('.kanban .bucket')
		const tasks = document.querySelector('.kanban .bucket .tasks')
		const chain: unknown[] = []
		let node: Element | null = bucket
		while (node && node !== document.body) {
			chain.push(describe(node))
			node = node.parentElement
		}
		return {
			viewport: [window.innerWidth, window.innerHeight],
			kanbanChildren: kanban ? Array.from(kanban.children).map(describe) : [],
			kanban: describe(kanban),
			kanbanScroll: kanban ? [kanban.scrollWidth, kanban.clientWidth, kanban.scrollLeft] : null,
			bucketChain: chain,
			tasks: describe(tasks),
			bucketCount: document.querySelectorAll('.kanban .bucket').length,
		}
	})

	throw new Error('KANBAN_DEBUG ' + JSON.stringify(info))
})

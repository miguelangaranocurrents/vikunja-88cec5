// TEMPORARY diagnostic: reports kanban drag-scroll behaviour through the failure message. Remove before finishing.
import type {Page} from '@playwright/test'
import {test} from '../../support/fixtures'
import {BucketFactory} from '../../factories/bucket'
import {ProjectFactory} from '../../factories/project'
import {TaskFactory} from '../../factories/task'
import {ProjectViewFactory} from '../../factories/project_view'
import {TaskBucketFactory} from '../../factories/task_buckets'

async function setupAndOpen(page: Page) {
	const projects = await ProjectFactory.create(1)
	await ProjectViewFactory.create(1, {id: 4, project_id: projects[0].id, view_kind: 3, bucket_configuration_mode: 1})
	const buckets = await BucketFactory.create(2, {project_view_id: 4})
	await BucketFactory.create(6, {id: (i: number) => buckets.length + i, project_view_id: 4}, false)
	const tasks = await TaskFactory.create(1, {project_id: projects[0].id})
	await TaskBucketFactory.create(1, {task_id: tasks[0].id, bucket_id: buckets[0].id, project_view_id: 4}, false)
	await page.goto('/projects/1/4')
	await page.waitForLoadState('networkidle')
	await page.locator('.kanban .bucket .tasks .task').filter({hasText: tasks[0].title}).first().waitFor()
	return tasks[0].title
}

async function dragFrom(page: Page, title: string, dx: number, moving: boolean, sensitivity?: number) {
	if (sensitivity !== undefined) {
		await page.evaluate((value) => {
			document.querySelectorAll<HTMLElement>('.kanban .tasks').forEach(el => {
				const key = Object.keys(el).find(k => k.startsWith('Sortable'))
				const inst = key ? (el as unknown as Record<string, {options: Record<string, unknown>}>)[key] : undefined
				if (inst) inst.options.scrollSensitivity = value
			})
		}, sensitivity)
	}

	const board = page.locator('.kanban')
	const boardBox = (await board.boundingBox())!
	const taskBox = (await page.locator('.kanban .bucket .tasks .task').filter({hasText: title}).first().boundingBox())!
	const target = {x: boardBox.x + boardBox.width - dx, y: boardBox.y + boardBox.height / 2}

	await page.mouse.move(taskBox.x + 20, taskBox.y + 10)
	await page.mouse.down()
	await page.mouse.move(target.x, target.y, {steps: 20})

	const samples: number[] = []
	const started = Date.now()
	while (Date.now() - started < 2500) {
		if (moving) {
			await page.mouse.move(target.x + 1, target.y)
			await page.mouse.move(target.x, target.y)
		}
		samples.push(await board.evaluate(el => Math.round(el.scrollLeft)))
		await page.waitForTimeout(250)
	}
	await page.mouse.up()
	return {dx, moving, sensitivity: sensitivity ?? 'default', samples}
}

for (const dx of [10, 20, 25, 30, 35, 40, 50, 60]) {
	test(`debug threshold ${dx}px`, async ({authenticatedPage: page}) => {
		const title = await setupAndOpen(page)
		const r = await dragFrom(page, title, dx, false)
		throw new Error('KANBAN_DEBUG ' + JSON.stringify(r))
	})
}

test('debug runtime sensitivity 100 at 60px while moving', async ({authenticatedPage: page}) => {
	const title = await setupAndOpen(page)
	const r = await dragFrom(page, title, 60, true, 100)
	throw new Error('KANBAN_DEBUG ' + JSON.stringify(r))
})

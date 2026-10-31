// TEMPORARY diagnostic: reports kanban drag-scroll behaviour through the failure message. Remove before finishing.
import {test} from '../../support/fixtures'
import {BucketFactory} from '../../factories/bucket'
import {ProjectFactory} from '../../factories/project'
import {TaskFactory} from '../../factories/task'
import {ProjectViewFactory} from '../../factories/project_view'
import {TaskBucketFactory} from '../../factories/task_buckets'

async function setup() {
	const projects = await ProjectFactory.create(1)
	await ProjectViewFactory.create(1, {id: 4, project_id: projects[0].id, view_kind: 3, bucket_configuration_mode: 1})
	const buckets = await BucketFactory.create(2, {project_view_id: 4})
	await BucketFactory.create(6, {id: (i: number) => buckets.length + i, project_view_id: 4}, false)
	const tasks = await TaskFactory.create(1, {project_id: projects[0].id})
	await TaskBucketFactory.create(1, {task_id: tasks[0].id, bucket_id: buckets[0].id, project_view_id: 4}, false)
	return tasks
}

async function drag(page: import('@playwright/test').Page, dx: number, moving: boolean) {
	const tasks = await setup()
	await page.goto('/projects/1/4')
	await page.waitForLoadState('networkidle')
	await page.locator('.kanban .bucket .tasks .task').filter({hasText: tasks[0].title}).first().waitFor()

	const board = page.locator('.kanban')
	const boardBox = (await board.boundingBox())!
	const taskBox = (await page.locator('.kanban .bucket .tasks .task').filter({hasText: tasks[0].title}).first().boundingBox())!
	const target = {x: boardBox.x + boardBox.width - dx, y: boardBox.y + boardBox.height / 2}

	await page.mouse.move(taskBox.x + 20, taskBox.y + 10)
	await page.mouse.down()
	await page.mouse.move(target.x, target.y, {steps: 20})
	const under = await page.evaluate(([x, y]) => {
		const el = document.elementFromPoint(x, y)
		return el ? `${el.tagName}.${(el as HTMLElement).className}|closest-tasks=${!!el.closest('.tasks')}` : 'none'
	}, [target.x, target.y])

	const samples: number[] = []
	const started = Date.now()
	while (Date.now() - started < 4000) {
		if (moving) {
			await page.mouse.move(target.x + 1, target.y)
			await page.mouse.move(target.x, target.y)
		}
		samples.push(await board.evaluate(el => Math.round(el.scrollLeft)))
		await page.waitForTimeout(250)
	}
	const max = await board.evaluate(el => el.scrollWidth - el.clientWidth)
	await page.mouse.up()
	return {dx, moving, target: [Math.round(target.x), Math.round(target.y)], under, max, samples}
}

test('debug A: stationary 60px from edge', async ({authenticatedPage: page}) => {
	const r = await drag(page, 60, false)
	throw new Error('KANBAN_DEBUG ' + JSON.stringify(r))
})

test('debug B: stationary 5px from edge', async ({authenticatedPage: page}) => {
	const r = await drag(page, 5, false)
	throw new Error('KANBAN_DEBUG ' + JSON.stringify(r))
})

test('debug C: moving 60px from edge', async ({authenticatedPage: page}) => {
	const r = await drag(page, 60, true)
	throw new Error('KANBAN_DEBUG ' + JSON.stringify(r))
})

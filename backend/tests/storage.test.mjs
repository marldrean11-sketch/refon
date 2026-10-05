import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

process.env.NODE_ENV = 'test'

const testRun = Date.now()

const { storage, saveAll, removeAll, isManagedFilename, detectImageType, generatePhotoFilename, contentTypeForFilename } =
  await import(
    new URL(`../src/services/storage.service.js?storage-test=${testRun}`, import.meta.url)
  )
const { uploadsDirectory } = await import(
  new URL(`../src/config/uploads.js?storage-test=${testRun}`, import.meta.url)
)

const realPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)
const realJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
const realWebp = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x1a, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
  Buffer.from('VP8 ', 'ascii'),
])

const created = []
const failures = []

async function check(name, run) {
  try {
    await run()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failures.push({ name, error })
    console.log(`  FAIL ${name}: ${error.message}`)
  }
}

try {
  // The default driver for this suite is local; the s3 driver has no bucket here.
  assert.equal(storage.name, 'local', 'these tests exercise the local driver')
  assert.equal(process.env.STORAGE_DRIVER, undefined)

  await check('save writes the bytes and returns the filename', async () => {
    const filename = generatePhotoFilename('image/png')
    created.push(filename)

    const returned = await storage.save({ buffer: realPng, filename })
    assert.equal(returned, filename)

    const onDisk = await fs.readFile(path.join(uploadsDirectory, filename))
    assert.ok(onDisk.equals(realPng))
  })

  await check('list reports saved files with a lastModified date', async () => {
    const listed = await storage.list()
    const entry = listed.find((file) => file.filename === created[0])

    assert.ok(entry, 'the saved file appears in the listing')
    assert.ok(entry.lastModified instanceof Date)
    assert.ok(!Number.isNaN(entry.lastModified.getTime()))
  })

  await check('list never reports seed assets or .gitkeep', async () => {
    const listed = await storage.list()
    const names = listed.map((file) => file.filename)

    assert.ok(!names.includes('.gitkeep'))
    assert.ok(!names.some((name) => name.startsWith('seed')))
    assert.ok(!names.some((name) => name.includes('/')))
  })

  await check('read returns the buffer, content type and length', async () => {
    const object = await storage.read(created[0])

    assert.ok(object.buffer.equals(realPng))
    assert.equal(object.contentType, 'image/png')
    assert.equal(object.contentLength, realPng.length)
  })

  await check('read returns null for a file that does not exist', async () => {
    assert.equal(await storage.read(`1-00000000-0000-4000-8000-000000000000.png`), null)
  })

  await check('read refuses a filename outside the managed pattern', async () => {
    for (const name of ['.env', 'seed/phone-front.svg', '../package.json', 'nope.png']) {
      assert.equal(await storage.read(name), null, `${name} must not be readable`)
    }
  })

  await check('remove deletes the file', async () => {
    await storage.remove(created[0])
    assert.equal(await storage.read(created[0]), null)
    created.splice(0, 1)
  })

  await check('remove is idempotent for a missing file', async () => {
    await storage.remove('1-00000000-0000-4000-8000-000000000000.png')
  })

  await check('saveAll stores a batch', async () => {
    const names = [
      generatePhotoFilename('image/jpeg'),
      generatePhotoFilename('image/webp'),
    ]
    created.push(...names)

    const saved = await saveAll([
      { buffer: realJpeg, filename: names[0] },
      { buffer: realWebp, filename: names[1] },
    ])

    assert.deepEqual(saved, names)
    assert.equal((await storage.read(names[0])).contentType, 'image/jpeg')
    assert.equal((await storage.read(names[1])).contentType, 'image/webp')
  })

  await check('saveAll rolls the batch back when one save fails', async () => {
    const good = generatePhotoFilename('image/png')
    created.push(good)

    await assert.rejects(
      saveAll([
        { buffer: realPng, filename: good },
        // A directory-shaped name cannot be written by the local driver.
        { buffer: realPng, filename: 'seed' },
      ]),
    )

    assert.equal(
      await storage.read(good),
      null,
      'the file saved before the failure must be rolled back',
    )
    created.splice(created.indexOf(good), 1)
  })

  await check('removeAll clears everything it is given', async () => {
    await removeAll([...created])
    for (const filename of created) {
      assert.equal(await storage.read(filename), null)
    }
    created.length = 0
  })

  await check('generated filenames match the managed pattern', () => {
    for (const mimetype of ['image/jpeg', 'image/png', 'image/webp']) {
      const filename = generatePhotoFilename(mimetype)
      assert.ok(isManagedFilename(filename), `${filename} should be managed`)
      assert.equal(path.extname(filename), mimetype === 'image/jpeg' ? '.jpg' : `.${mimetype.split('/')[1]}`)
    }
  })

  await check('isManagedFilename rejects path and shape violations', () => {
    const valid = `${Date.now()}-0affd183-7680-465d-bf21-d300d63fa9e0.jpg`

    assert.equal(isManagedFilename(valid), true)
    for (const bad of [
      '',
      'seed/phone-front.svg',
      'seed\\phone-front.svg',
      '../package.json',
      '.env',
      '.gitkeep',
      'phone-front.svg',
      '12345.jpg',
      '12345-0affd183-7680-465d-bf21-d300d63fa9e0.exe',
      '12345-0AFFD183-7680-465D-BF21-D300D63FA9E0.jpg',
      null,
      undefined,
      12345,
    ]) {
      assert.equal(isManagedFilename(bad), false, `${String(bad)} must be rejected`)
    }
  })

  await check('detectImageType identifies real image bytes', () => {
    assert.equal(detectImageType(realPng), 'image/png')
    assert.equal(detectImageType(realJpeg), 'image/jpeg')
    assert.equal(detectImageType(realWebp), 'image/webp')
  })

  await check('detectImageType rejects non-images and undersized buffers', () => {
    assert.equal(detectImageType(Buffer.from('just some text, definitely not an image')), null)
    assert.equal(detectImageType(Buffer.from('%PDF-1.4 not an image either')), null)
    assert.equal(detectImageType(Buffer.alloc(0)), null)
    assert.equal(detectImageType(Buffer.from([0x89, 0x50])), null)
    assert.equal(detectImageType('not a buffer'), null)
  })

  await check('a PNG header followed by script is still a PNG by bytes', () => {
    // The check is deliberately about magic bytes only; it is a type gate, not a
    // full decoder, so it must not reject a truncated or exotic but valid PNG.
    assert.equal(detectImageType(Buffer.concat([realPng, Buffer.from('junk')])), 'image/png')
  })

  await check('contentTypeForFilename maps the managed extensions', () => {
    assert.equal(contentTypeForFilename('a.jpg'), 'image/jpeg')
    assert.equal(contentTypeForFilename('a.png'), 'image/png')
    assert.equal(contentTypeForFilename('a.webp'), 'image/webp')
    assert.equal(contentTypeForFilename('a.svg'), 'image/svg+xml')
    assert.equal(contentTypeForFilename('a.exe'), null)
  })

  console.log('')
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`FAILED: ${failure.name}`)
      console.error(failure.error.stack)
    }
    process.exitCode = 1
  } else {
    console.log('Storage E2E passed: local driver save/list/read/remove, batch rollback, filename guard, magic-byte detection')
  }
} finally {
  // Never leave fixtures behind, even when an assertion failed.
  for (const filename of created) {
    await storage.remove(filename).catch(() => {})
  }
}
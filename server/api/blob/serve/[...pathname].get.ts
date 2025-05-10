export default eventHandler(async (event) => {
  const pathnameParams = getRouterParams(event).pathname
  const pathname = Array.isArray(pathnameParams) ? pathnameParams.join('/') : pathnameParams || ''

  if (!pathname) {
    throw createError({
      statusCode: 400,
      message: 'Pathname is required'
    })
  }

  // Set security headers
  setHeader(event, 'Content-Security-Policy', 'default-src \'none\'; img-src \'self\' data:;')

  // Serve the blob file
  return hubBlob().serve(event, pathname)
})

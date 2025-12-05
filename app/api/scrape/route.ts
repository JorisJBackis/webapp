export async function POST(request: Request) {
    try {
        const { clubId } = await request.json()

        if (!clubId) {
            return Response.json({ error: 'clubId required' },{ status: 400 })
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(),30000)

        try {
            const response = await fetch(`http://34.88.228.95:8080/scrape/${clubId}`,{
                method: 'GET',
                signal: controller.signal
            })

            clearTimeout(timeoutId)
            const data = await response.json()
            return Response.json(data)
        } finally {
            clearTimeout(timeoutId)
        }
    } catch (err: any) {
        console.error('Scrape error:',err)
        return Response.json({ error: err.message },{ status: 500 })
    }
}
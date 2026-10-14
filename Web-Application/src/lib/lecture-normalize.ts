import { Animation, ContentSection, LectureContent } from '../types'

interface StorageObject {
  bucket: string
  path: string
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * Recognize Google Cloud Storage references:
 *   gs://bucket/path
 *   https://storage.googleapis.com/bucket/path   (what the pipeline stores)
 * Returns the bucket and the decoded object path, or null for any other URL.
 */
export function parseStorageUrl(url: string): StorageObject | null {
  const match =
    /^gs:\/\/([^/]+)\/(.+)$/.exec(url) ||
    /^https:\/\/storage\.googleapis\.com\/([^/]+)\/([^?#]+)$/.exec(url)
  if (!match) return null
  const [, bucket, rawPath] = match
  return { bucket, path: rawPath.split('/').map(safeDecode).join('/') }
}

/**
 * Turn a stored media reference into something a browser can load.
 *
 * Objects in our own bucket go through /api/media, which redirects to a
 * short-lived signed URL, so the bucket no longer has to be public. Other
 * buckets fall back to their public https URL (gs:// can't be played).
 */
export function toBrowserUrl(
  url?: string | null,
  ownBucket: string | undefined = process.env.NEXT_PUBLIC_GCS_BUCKET_NAME
): string {
  if (!url) return ''
  const obj = parseStorageUrl(url)
  if (!obj) return url
  if (ownBucket && obj.bucket === ownBucket) {
    return `/api/media?path=${encodeURIComponent(obj.path)}`
  }
  const encoded = obj.path.split('/').map(encodeURIComponent).join('/')
  return `https://storage.googleapis.com/${obj.bucket}/${encoded}`
}

const IMAGE_URL = /^(https?|gs):\/\/.+\.(png|jpe?g|gif|webp)(\?.*)?$/i

/**
 * The Python pipeline stores content_data as an array of topics:
 *   [{ topic, details, question, book_references: string[], animations: [{ title, video, ... }] }]
 * while hand-authored content uses { content, doubts, examples, animations }.
 * Normalize both into the shape the UI renders.
 */
export function normalizeContentData(contentData: any): {
  content: ContentSection[]
  doubts: LectureContent['doubts']
  examples: LectureContent['examples']
  animations: Animation[]
  textReferences: string[]
} {
  if (!Array.isArray(contentData)) {
    const data = contentData || {}
    return {
      content: data.content || [],
      doubts: data.doubts || [],
      examples: data.examples || [],
      animations: (data.animations || []).map((a: Animation) => ({
        ...a,
        thumbnail: toBrowserUrl(a.thumbnail),
      })),
      textReferences: [],
    }
  }

  const content: ContentSection[] = []
  const animations: Animation[] = []
  const textReferences = new Set<string>()

  contentData.forEach((topic: any, idx: number) => {
    const refs: string[] = (topic?.book_references || []).filter(
      (r: unknown): r is string => typeof r === 'string' && r.trim().length > 0
    )
    const imageRefs = refs.filter((r) => IMAGE_URL.test(r))
    const textRefs = refs.filter((r) => !IMAGE_URL.test(r))
    textRefs.forEach((r) => textReferences.add(r))

    content.push({
      id: `topic-${idx + 1}`,
      type: 'concept',
      title: topic?.topic || `Topic ${idx + 1}`,
      content: topic?.details || '',
      professorNote: topic?.question ? `Think about it: ${topic.question}` : undefined,
      image: imageRefs[0] ? toBrowserUrl(imageRefs[0]) : undefined,
      imageCaption: imageRefs[0] ? 'Figure from the course textbook' : undefined,
      bookReference: textRefs.length ? textRefs.join('; ') : undefined,
    })

    ;(topic?.animations || []).forEach((anim: any, animIdx: number) => {
      if (!anim?.video) return
      animations.push({
        id: `anim-${idx + 1}-${animIdx + 1}`,
        title: anim.title || topic?.topic || 'Animation',
        description: topic?.topic ? `Visualizing: ${topic.topic}` : '',
        thumbnail: toBrowserUrl(anim.video),
        type: 'video',
      })
    })
  })

  return { content, doubts: [], examples: [], animations, textReferences: Array.from(textReferences) }
}

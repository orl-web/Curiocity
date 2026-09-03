import mammoth from 'mammoth'

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export async function parseTxt(file: File): Promise<string> {
  return readFileAsText(file)
}

export async function parseMarkdown(file: File): Promise<string> {
  const text = await readFileAsText(file)
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/---+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await readFileAsArrayBuffer(file)
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export async function parseDescriptionFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'txt':
      return parseTxt(file)
    case 'md':
    case 'markdown':
      return parseMarkdown(file)
    case 'docx':
      return parseDocx(file)
    default:
      throw new Error(`Unsupported file format: .${ext}. Use .txt, .md, or .docx`)
  }
}

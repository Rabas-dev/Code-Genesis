import JSZip from 'jszip'
import type { ProjectFile } from '@/types'

export async function downloadProjectZip(files: ProjectFile[], projectName: string) {
  const zip = new JSZip()
  const folder = zip.folder(projectName.replace(/[^a-z0-9-_]/gi, '-').toLowerCase()) ?? zip

  for (const file of files) {
    folder.file(file.path, file.content)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectName.replace(/[^a-z0-9-_]/gi, '-').toLowerCase()}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

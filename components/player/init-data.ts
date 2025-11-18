import {BentoBlockData} from "@/components/player/bento-block";

export interface GridLayout {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export const initialBlocks: BentoBlockData[] = [
  {
    id: '1',
    type: 'text',
    title: 'About',
    content: 'Goalkeeper with 5 years of professional experience. Known for quick reflexes and excellent positioning.',
  },
  {
    id: '2',
    type: 'link',
    title: 'Highlight Reel',
    content: 'Best saves from 2024 season',
    url: 'https://youtube.com',
  },
  {
    id: '3',
    type: 'image',
    title: 'Action Shot',
    url: '/placeholder.svg?height=400&width=400',
  },
  {
    id: '4',
    type: 'text',
    title: 'Stats',
    content: 'Clean sheets: 12 | Save percentage: 78% | Appearances: 34',
  },
]

export const initialLayouts: GridLayout[] = [
  {id: '1', x: 0, y: 0, w: 2, h: 1},
  {id: '2', x: 2, y: 0, w: 1, h: 1},
  {id: '3', x: 0, y: 1, w: 1, h: 2},
  {id: '4', x: 1, y: 1, w: 2, h: 1},
]

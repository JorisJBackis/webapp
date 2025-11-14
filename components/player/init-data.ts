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
    type: 'bio',
    title: 'Alex Chen',
    content: 'Product designer & developer crafting delightful digital experiences. Currently building the future of web design tools.',
  },
  {
    id: '2',
    type: 'social',
    title: 'GitHub',
    content: '@alexchen',
    icon: 'github',
    url: 'https://github.com',
    color: 'bg-gray-100 dark:bg-gray-800',
  },
  {
    id: '3',
    type: 'social',
    title: 'Twitter',
    content: '@alexchen',
    icon: 'twitter',
    url: 'https://twitter.com',
    color: 'bg-sky-100 dark:bg-sky-950',
  },
  {
    id: '4',
    type: 'link',
    title: 'Portfolio',
    content: 'Check out my latest design projects and case studies',
    url: 'https://example.com',
  },
  {
    id: '5',
    type: 'image',
    title: 'Featured Work',
    url: '/modern-abstract-design-artwork.jpg',
  },
  {
    id: '6',
    type: 'text',
    title: 'What I Do',
    content: 'I specialize in creating beautiful, functional user interfaces with a focus on typography, color, and motion design.',
  },
]

export const initialLayouts: GridLayout[] = [
  { id: '1', x: 0, y: 0, w: 2, h: 2 },
  { id: '2', x: 2, y: 0, w: 1, h: 1 },
  { id: '3', x: 3, y: 0, w: 1, h: 1 },
  { id: '4', x: 2, y: 1, w: 1, h: 2 },
  { id: '5', x: 0, y: 2, w: 2, h: 2 },
  { id: '6', x: 3, y: 1, w: 1, h: 2 },
]
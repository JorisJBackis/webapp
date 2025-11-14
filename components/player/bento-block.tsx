'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Github, Linkedin, Twitter, Mail, Instagram, LinkIcon, ImageIcon, Trash2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BlockType = 'bio' | 'social' | 'image' | 'link' | 'text'

export interface BentoBlockData {
  id: string
  type: BlockType
  title?: string
  content?: string
  icon?: string
  url?: string
  color?: string
}

interface BentoBlockProps {
  data: BentoBlockData
  onRemove?: (id: string) => void
  isEditing?: boolean
}

const socialIcons: Record<string, React.ReactNode> = {
  github: <Github className="h-5 w-5" />,
  linkedin: <Linkedin className="h-5 w-5" />,
  twitter: <Twitter className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  instagram: <Instagram className="h-5 w-5" />,
  link: <LinkIcon className="h-5 w-5" />,
}

export function BentoBlock({ data, onRemove, isEditing }: BentoBlockProps) {
  const renderContent = () => {
    switch (data.type) {
      case 'bio':
        return (
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-bold leading-tight text-balance">{data.title || 'Your Name'}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.content || 'Your bio goes here. Tell the world about yourself!'}</p>
            </div>
        )

      case 'social':
        return (
            <a
                href={data.url || '#'}
                className="flex items-center gap-3 group"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => isEditing && e.preventDefault()}
            >
              <div className={cn(
                  "p-2.5 rounded-lg transition-transform group-hover:scale-110",
                  data.color || "bg-primary/10"
              )}>
                {data.icon && socialIcons[data.icon] ? (
                    <span className="text-foreground">{socialIcons[data.icon]}</span>
                ) : (
                    <LinkIcon className="h-5 w-5 text-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-semibold text-sm">{data.title || 'Social Link'}</span>
                <span className="text-xs text-muted-foreground truncate">{data.content || '@username'}</span>
              </div>
            </a>
        )

      case 'image':
        return (
            <div className="relative w-full h-full rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5">
              {data.url ? (
                  <img
                      src={data.url || "/placeholder.svg"}
                      alt={data.title || 'Image'}
                      className="w-full h-full object-cover"
                  />
              ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                  </div>
              )}
            </div>
        )

      case 'link':
        return (
            <a
                href={data.url || '#'}
                className="flex flex-col gap-2 h-full justify-between group"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => isEditing && e.preventDefault()}
            >
              <div className="flex flex-col gap-1.5">
                <h3 className="font-semibold leading-tight text-balance group-hover:text-primary transition-colors">{data.title || 'Link Title'}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{data.content || 'Description of your link'}</p>
              </div>
              <LinkIcon className="h-4 w-4 text-muted-foreground self-end mt-auto" />
            </a>
        )

      case 'text':
        return (
            <div className="flex flex-col gap-2 h-full">
              {data.title && <h3 className="font-semibold text-lg leading-tight text-balance">{data.title}</h3>}
              <p className="text-sm text-muted-foreground leading-relaxed">{data.content || 'Your text content here'}</p>
            </div>
        )

      default:
        return null
    }
  }

  return (
      <Card className="relative h-full w-full overflow-hidden transition-all hover:shadow-lg group/block">
        {isEditing && (
            <>
              <div className="absolute top-2 left-2 z-10 cursor-move opacity-0 group-hover/block:opacity-100 transition-opacity">
                <div className="bg-background/90 backdrop-blur-sm rounded-md p-1 shadow-sm">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {onRemove && (
                  <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full bg-muted/80 backdrop-blur-sm text-muted-foreground hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover/block:opacity-100 transition-all shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(data.id)
                      }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
              )}
            </>
        )}

        <div className={cn(
            "p-4 h-full",
            data.type === 'image' && "p-0"
        )}>
          {renderContent()}
        </div>
      </Card>
  )
}

'use client'

import {Card} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Textarea} from '@/components/ui/textarea'
import {LinkIcon, ImageIcon, Trash2, GripVertical} from 'lucide-react'
import {cn} from '@/lib/utils'
import {useState} from 'react'

export type BlockType = 'image' | 'link' | 'text'

export interface BentoBlockData {
  id: string
  type: BlockType
  content?: string
}

interface BentoBlockProps {
  data: BentoBlockData
  onRemove?: (id: string) => void
  onUpdate?: (id: string, updates: Partial<BentoBlockData>) => void
  isEditing?: boolean
}

export function BentoBlock({data, onRemove, onUpdate, isEditing}: BentoBlockProps) {
  const [isEditingContent, setIsEditingContent] = useState(false)

  const renderContent = () => {
    switch (data.type) {
      case 'image':
        return (
            <div className="relative w-full h-full rounded-lg overflow-hidden">
              {isEditing && isEditingContent ? (
                  <div className="flex flex-col gap-2 p-4 h-full justify-center bg-muted/30">
                    <Input
                        placeholder="Image URL"
                        value={data.content || ''}
                        onChange={(e) => onUpdate?.(data.id, {content: e.target.value})}
                        className="text-sm"
                    />
                    <Button
                        size="sm"
                        onClick={() => setIsEditingContent(false)}
                    >
                      Done
                    </Button>
                  </div>
              ) : (
                  <>
                    {data.content ? (
                        <img
                            src={data.content || "/placeholder.svg"}
                            alt={data.content || 'Image'}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => isEditing && setIsEditingContent(true)}
                        />
                    ) : (
                        <div
                            className="flex items-center justify-center w-full h-full bg-muted/30 shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] cursor-pointer"
                            onClick={() => isEditing && setIsEditingContent(true)}
                        >
                          <ImageIcon className="h-12 w-12 text-muted-foreground/30"/>
                        </div>
                    )}
                  </>
              )}
            </div>
        )

      case 'link':
        return (
            <>
              {isEditing && isEditingContent ? (
                  <div className="flex flex-col gap-3 h-full justify-center">
                    <Input
                        placeholder="https://..."
                        value={data.content || ''}
                        onChange={(e) => onUpdate?.(data.id, {content: e.target.value})}
                        className="text-xs"
                        onBlur={() => setIsEditingContent(false)}

                    />
                  </div>
              ) : (
                  <a
                      href={data.content || '#'}
                      className="flex flex-col gap-2 h-full justify-between group cursor-pointer"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (isEditing) {
                          e.preventDefault()
                          setIsEditingContent(true)
                        }
                      }}
                  >
                    <div className="flex flex-col gap-1.5  ">
                      <p className="text-base text-muted-foreground leading-relaxed hover:underline overflow-ellipsis block overflow-hidden whitespace-nowrap">
                        {data.content || 'Your link'}
                      </p>
                    </div>
                    <LinkIcon className="h-4 w-4 text-muted-foreground self-end mt-auto"/>
                  </a>
              )}
            </>
        )

      case 'text':
        return (
            <>
              {isEditing && isEditingContent ? (
                  <div className="flex flex-col gap-3 h-full">
                    <Textarea
                        placeholder="Your text content here"
                        value={data.content || ''}
                        onChange={(e) => onUpdate?.(data.id, {content: e.target.value})}
                        className="text-sm flex-1 min-h-[100px]"
                        onBlur={() => setIsEditingContent(false)}
                    />
                  </div>
              ) : (
                  <div
                      className="flex flex-col gap-2 h-full cursor-pointer"
                      onClick={() => isEditing && setIsEditingContent(true)}
                  >
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {data.content || 'Your text content here'}
                    </p>
                  </div>
              )}
            </>
        )



      default:
        return null
    }
  }

  return (
      <Card
          className="relative h-full w-full overflow-hidden transition-all hover:shadow-lg group/block overflow-visible">
        {isEditing && (
            <>
              <div
                  className="absolute top-2 left-2 z-10 cursor-move opacity-0 group-hover/block:opacity-100 transition-opacity">
                <div className="bg-background/90 backdrop-blur-sm rounded-md p-1 shadow-sm">
                  <GripVertical className="h-4 w-4 text-muted-foreground"/>
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
                    <Trash2 className="h-3.5 w-3.5"/>
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

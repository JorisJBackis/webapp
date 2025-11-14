'use client'

import {useState, useRef, useEffect} from 'react'
import {BentoBlock, BentoBlockData} from './bento-block'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {
  Plus,
  User,
  Link2,
  Image,
  FileText,
  Share2,
  Eye,
  Edit3,
  Square,
  RectangleHorizontal,
  RectangleVertical
} from 'lucide-react'
import {GridLayout, initialBlocks, initialLayouts} from "@/components/player/init-data";


export function BentoGridEditor() {
  const [blocks, setBlocks] = useState<BentoBlockData[]>(initialBlocks)
  const [layouts, setLayouts] = useState<GridLayout[]>(initialLayouts)
  const [isEditing, setIsEditing] = useState(true)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  const handleRemoveBlock = (id: string) => {
    setBlocks(blocks.filter((block) => block.id !== id))
    setLayouts(layouts.filter((layout) => layout.id !== id))
  }

  const handleAddBlock = (type: BentoBlockData['type']) => {
    const newId = Date.now().toString()
    const newBlock: BentoBlockData = {
      id: newId,
      type,
      title: type === 'bio' ? 'New Bio' : type === 'social' ? 'Social Link' : type === 'link' ? 'New Link' : type === 'text' ? 'New Text' : 'Image',
      content: type === 'bio' ? 'Add your bio here' : type === 'social' ? '@username' : type === 'link' ? 'Link description' : type === 'text' ? 'Your content here' : undefined,
      icon: type === 'social' ? 'link' : undefined,
    }

    const maxY = Math.max(...layouts.map(l => l.y + l.h), 0)
    const newLayout: GridLayout = {
      id: newId,
      x: 0,
      y: maxY,
      w: type === 'bio' ? 2 : 1,
      h: type === 'bio' || type === 'image' ? 2 : 1,
    }

    setBlocks([...blocks, newBlock])
    setLayouts([...layouts, newLayout])
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isEditing) return
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!isEditing || !draggedId || draggedId === id) return
    e.preventDefault()

    if (dragOverId !== id) {
      setDragOverId(id)

      const draggedIndex = layouts.findIndex(l => l.id === draggedId)
      const targetIndex = layouts.findIndex(l => l.id === id)

      if (draggedIndex === -1 || targetIndex === -1) return

      const newLayouts = [...layouts]
      const draggedLayout = {...newLayouts[draggedIndex]}
      const targetLayout = {...newLayouts[targetIndex]}

      const tempPos = {x: draggedLayout.x, y: draggedLayout.y}
      draggedLayout.x = targetLayout.x
      draggedLayout.y = targetLayout.y
      targetLayout.x = tempPos.x
      targetLayout.y = tempPos.y

      newLayouts[draggedIndex] = draggedLayout
      newLayouts[targetIndex] = targetLayout

      setLayouts(newLayouts)
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (!isEditing || !draggedId || draggedId === targetId) {
      setDragOverId(null)
      return
    }

    e.preventDefault()

    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleResizeBlock = (id: string, w: number, h: number) => {
    setLayouts(prev => prev.map(layout =>
        layout.id === id
            ? {...layout, w, h}
            : layout
    ))
  }

  return (
      <div className="min-h-screen bg-background relative">
        <EditingBar isEditing={isEditing} handleAddBlock={handleAddBlock}/>
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">B</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">Bento Editor</h1>
                <p className="text-xs text-muted-foreground">Build your personal page</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                  variant={isEditing ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="gap-2"
              >
                {isEditing ? (
                    <>
                      <Eye className="h-4 w-4"/>
                      Preview
                    </>
                ) : (
                    <>
                      <Edit3 className="h-4 w-4"/>
                      Edit
                    </>
                )}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="h-4 w-4"/>
                Share
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-[1fr_280px] gap-6">
            <div className="order-2 lg:order-1 justify-center items-center">
              <div className="grid grid-cols-4 auto-rows-[180px] gap-4 max-w-[820px]">
                {layouts
                    .sort((a, b) => {
                      if (a.y !== b.y) return a.y - b.y
                      return a.x - b.x
                    })
                    .map((layout) => {
                      const block = blocks.find((b) => b.id === layout.id)
                      if (!block) return null

                      const isDragged = draggedId === layout.id
                      const isPlaceholder = dragOverId === layout.id && draggedId !== null

                      return (
                          <div
                              key={layout.id}
                              draggable={isEditing}
                              onDragStart={(e) => handleDragStart(e, layout.id)}
                              onDragOver={(e) => handleDragOver(e, layout.id)}
                              onDrop={(e) => handleDrop(e, layout.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => isEditing && setSelectedBlockId(layout.id)}
                              style={{
                                gridColumn: `span ${layout.w}`,
                                gridRow: `span ${layout.h}`,
                              }}
                              className={`relative transition-all duration-200 cursor-pointer ${
                                  isDragged ? 'opacity-40 scale-95 z-50' : ''
                              } ${
                                  isPlaceholder
                                      ? 'ring-2 ring-primary ring-offset-4 ring-offset-background scale-[0.98]'
                                      : ''
                              } ${
                                  selectedBlockId === layout.id && !isDragged ? 'ring-2 ring-primary' : ''
                              }`}
                          >
                            {isPlaceholder && (
                                <div
                                    className="absolute inset-0 bg-primary/5 rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center z-10">
                                  <div className="text-sm font-medium text-primary">Drop here</div>
                                </div>
                            )}

                            <BentoBlock
                                data={block}
                                onRemove={handleRemoveBlock}
                                isEditing={isEditing}
                            />

                            {isEditing && selectedBlockId === layout.id && (
                                <div
                                    className="absolute -top-12 left-0 bg-card border border-border rounded-lg shadow-lg p-1 flex gap-1 z-20">
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-auto px-2 gap-1.5"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleResizeBlock(layout.id, 1, 1)
                                      }}
                                  >
                                    <Square className="h-3 w-3"/>
                                    <span className="text-xs">1×1</span>
                                  </Button>
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-auto px-2 gap-1.5"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleResizeBlock(layout.id, 1, 2)
                                      }}
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <div className="h-1.5 w-2.5 bg-current rounded-sm"/>
                                      <div className="h-1.5 w-2.5 bg-current rounded-sm"/>
                                    </div>
                                    <span className="text-xs">0.5×2</span>
                                  </Button>
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-auto px-2 gap-1.5"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleResizeBlock(layout.id, 2, 1)
                                      }}
                                  >
                                    <RectangleHorizontal className="h-3 w-3"/>
                                    <span className="text-xs">1×2</span>
                                  </Button>
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-auto px-2 gap-1.5"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleResizeBlock(layout.id, 1, 2)
                                      }}
                                  >
                                    <RectangleVertical className="h-3 w-3"/>
                                    <span className="text-xs">2×1</span>
                                  </Button>
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-auto px-2 gap-1.5"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleResizeBlock(layout.id, 2, 2)
                                      }}
                                  >
                                    <Square className="h-4 w-4"/>
                                    <span className="text-xs">2×2</span>
                                  </Button>
                                </div>
                            )}
                          </div>
                      )
                    })}
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}

export function EditingBar({isEditing, handleAddBlock}: {
  isEditing: boolean,
  handleAddBlock: (type: BentoBlockData['type']) => void
}) {
  if (!isEditing) {
    return null;
  }
  return (
      <Card className="p-4 absolute bottom-10 left-1/2 -translate-x-1/2  z-[51]">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4"/>
          Add Blocks
        </h3>
        <div className="flex flex-row gap-2">
          <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleAddBlock('bio')}
          >
            <User className="h-4 w-4"/>
            <div className="text-left">
              <div className="font-medium text-sm">Bio</div>
              <div className="text-xs text-muted-foreground">Name & description</div>
            </div>
          </Button>

          <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleAddBlock('social')}
          >
            <Share2 className="h-4 w-4"/>
            <div className="text-left">
              <div className="font-medium text-sm">Social</div>
              <div className="text-xs text-muted-foreground">Social media link</div>
            </div>
          </Button>

          <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleAddBlock('link')}
          >
            <Link2 className="h-4 w-4"/>
            <div className="text-left">
              <div className="font-medium text-sm">Link</div>
              <div className="text-xs text-muted-foreground">External link</div>
            </div>
          </Button>

          <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleAddBlock('image')}
          >
            <Image className="h-4 w-4"/>
            <div className="text-left">
              <div className="font-medium text-sm">Image</div>
              <div className="text-xs text-muted-foreground">Photo or artwork</div>
            </div>
          </Button>

          <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleAddBlock('text')}
          >
            <FileText className="h-4 w-4"/>
            <div className="text-left">
              <div className="font-medium text-sm">Text</div>
              <div className="text-xs text-muted-foreground">Rich text block</div>
            </div>
          </Button>
        </div>
      </Card>
  )
}

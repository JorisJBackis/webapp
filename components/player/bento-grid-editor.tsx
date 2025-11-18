'use client'

import {useState, useRef, useEffect} from 'react'
import {BentoBlock, BentoBlockData} from './bento-block'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import { Plus, User, Link2, Image, FileText, Share2, Eye, Edit3, Square, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import {GridLayout, initialBlocks, initialLayouts} from "@/components/player/init-data";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {AnimatePresence, motion} from "framer-motion";

function findAvailablePosition(
    layouts: GridLayout[],
    width: number,
    height: number,
    cols: number = 4
): { x: number; y: number } {
  // Try to find an empty spot starting from top-left
  const maxY = Math.max(...layouts.map(l => l.y + l.h), 0, 10)

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= cols - width; x++) {
      if (canPlaceAt(layouts, x, y, width, height)) {
        return { x, y }
      }
    }
  }

  // If no space found, place at bottom
  return { x: 0, y: maxY }
}

function canPlaceAt(
    layouts: GridLayout[],
    x: number,
    y: number,
    w: number,
    h: number,
    excludeId?: string
): boolean {
  // Check if the position is valid in the grid
  if (x < 0 || x + w > 4) return false

  // Check for collisions with existing blocks
  for (const layout of layouts) {
    if (excludeId && layout.id === excludeId) continue

    const hasCollision = !(
        x >= layout.x + layout.w ||
        x + w <= layout.x ||
        y >= layout.y + layout.h ||
        y + h <= layout.y
    )

    if (hasCollision) return false
  }

  return true
}

function compactGrid(layouts: GridLayout[]): GridLayout[] {
  const sorted = [...layouts].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y
    return a.x - b.x
  })

  const compacted: GridLayout[] = []

  for (const layout of sorted) {
    let newY = 0

    // Try to move block as far up as possible
    while (newY < layout.y) {
      if (canPlaceAt(compacted, layout.x, newY, layout.w, layout.h)) {
        break
      }
      newY++
    }

    compacted.push({
      ...layout,
      y: newY
    })
  }

  return compacted
}

export function BentoGridEditor({editorMode, initialBlocks, initialLayouts} : {editorMode: boolean, initialBlocks:BentoBlockData[], initialLayouts: GridLayout[]}) {
  const [blocks, setBlocks] = useState<BentoBlockData[]>(initialBlocks)
  const [layouts, setLayouts] = useState<GridLayout[]>(initialLayouts)
  const [isEditing, setIsEditing] = useState(editorMode)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  const handleUpdateBlock = (id: string, updates: Partial<BentoBlockData>) => {
    setBlocks(prev => prev.map(block =>
        block.id === id ? { ...block, ...updates } : block
    ))
  }

  const handleRemoveBlock = (id: string) => {
    setBlocks(blocks.filter((block) => block.id !== id))
    const newLayouts = layouts.filter((layout) => layout.id !== id)
    setLayouts(compactGrid(newLayouts))
  }

  const handleAddBlock = (type: BentoBlockData['type']) => {
    const newId = Date.now().toString()
    const newBlock: BentoBlockData = {
      id: newId,
      type,
      title: type === 'link' ? 'New Link' : type === 'text' ? 'New Text' : 'Image',
      content: type === 'link' ? 'Link description' : type === 'text' ? 'Your content here' : undefined,
    }

    const w = 1
    const h = type === 'image' ? 2 : 1
    const position = findAvailablePosition(layouts, w, h)

    const newLayout: GridLayout = {
      id: newId,
      x: position.x,
      y: position.y,
      w,
      h,
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

      setLayouts(compactGrid(newLayouts))
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
    const layout = layouts.find(l => l.id === id)
    if (!layout) return

    if (canPlaceAt(layouts, layout.x, layout.y, w, h, id)) {
      setLayouts(prev => compactGrid(prev.map(l =>
          l.id === id ? {...l, w, h} : l
      )))
    }
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
              {/*<Button*/}
              {/*    variant={isEditing ? 'default' : 'outline'}*/}
              {/*    size="sm"*/}
              {/*    onClick={() => setIsEditing(!isEditing)}*/}
              {/*    className="gap-2"*/}
              {/*>*/}
              {/*  {isEditing ? (*/}
              {/*      <>*/}
              {/*        <Eye className="h-4 w-4"/>*/}
              {/*        Preview*/}
              {/*      </>*/}
              {/*  ) : (*/}
              {/*      <>*/}
              {/*        <Edit3 className="h-4 w-4"/>*/}
              {/*        Edit*/}
              {/*      </>*/}
              {/*  )}*/}
              {/*</Button>*/}
              {/*<Button variant="outline" size="sm" className="gap-2">*/}
              {/*  <Share2 className="h-4 w-4"/>*/}
              {/*  Share*/}
              {/*</Button>*/}
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between gap-6">
            <div className=" flex flex-col max-h-screen justify-start items-start min-w-40 gap-6">
              <Avatar className="size-48">
                <AvatarFallback className="text-xs">
                  image
                </AvatarFallback>
              </Avatar>
              <div className="text-xl">
                Sviatoslav
              </div>
              <div className="text-lg text-muted-foreground">
                Goalkeeper
              </div>
            </div>
            <div className="flex justify-center items-center">
              <div className="grid grid-cols-4 auto-rows-[180px] gap-4 max-w-[820px]">
                <AnimatePresence mode="popLayout">

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
                            <motion.div
                                key={layout.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{
                                  opacity: isDragged ? 0.4 : 1,
                                  scale: isDragged ? 0.95 : 1
                                }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.8,
                                  transition: { duration: 0.2 }
                                }}
                                transition={{
                                  layout: { type: "spring", stiffness: 350, damping: 25 },
                                  opacity: { duration: 0.2 },
                                  scale: { duration: 0.2 }
                                }}
                                draggable={isEditing}
                                onDragStart={(e) => handleDragStart(e as any, layout.id)}
                                onDragOver={(e) => handleDragOver(e as any, layout.id)}
                                onDrop={(e) => handleDrop(e as any, layout.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => isEditing && setSelectedBlockId(layout.id)}
                                style={{
                                  gridColumn: `span ${layout.w}`,
                                  gridRow: `span ${layout.h}`,
                                }}
                                className={`relative cursor-pointer ${
                                    isPlaceholder
                                        ? 'ring-2 ring-primary ring-offset-4 ring-offset-background'
                                        : ''
                                } ${
                                    selectedBlockId === layout.id && !isDragged ? 'ring-2 ring-primary' : ''
                                }`}
                            >
                              {isPlaceholder && (
                                  <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      className="absolute inset-0 bg-primary/5 rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center z-10">
                                    <div className="text-sm font-medium text-primary">Drop here</div>
                                  </motion.div>
                              )}

                              <BentoBlock
                                  data={block}
                                  onRemove={handleRemoveBlock}
                                  onUpdate={handleUpdateBlock}
                                  isEditing={isEditing}
                              />

                              {isEditing && selectedBlockId === layout.id && (
                                  <motion.div
                                      initial={{ opacity: 0, y: -4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -4 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute -top-12 left-0 bg-card border border-border rounded-lg shadow-lg p-1 flex gap-1 z-[999]">
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
                                  </motion.div>
                              )}
                            </motion.div>
                        )
                      })}
                </AnimatePresence>
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
      <Card className="p-4 fixed bottom-10 left-1/2 -translate-x-1/2  z-[51]">
        {/*<h3 className="font-semibold text-sm mb-4 flex items-center gap-2">*/}
        {/*  <Plus className="h-4 w-4"/>*/}
          {/*Add Blocks*/}
        {/*</h3>*/}
        <div className="flex flex-row gap-2">
          <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleAddBlock('link')}
          >
            <Link2 className="h-4 w-4"/>
            <div className="text-left">
              <div className="font-medium text-sm">Link</div>
              {/*<div className="text-xs text-muted-foreground">External link</div>*/}
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
              {/*<div className="text-xs text-muted-foreground">Photo or artwork</div>*/}
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
              {/*<div className="text-xs text-muted-foreground">Rich text block</div>*/}
            </div>
          </Button>
        </div>
      </Card>
  )
}

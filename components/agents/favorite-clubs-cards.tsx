"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card,CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Trash2,
  Edit,
  Save,
  X,
  ExternalLink,
  Building2,
  Users,
  TrendingUp,
  Euro,
  Phone,
  Mail,
  User,
  Briefcase,
  Plus
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { FavoriteClub,ClubContact } from '@/app/dashboard/agents/clubs/page'
import { getCountryFlag } from '@/lib/utils/country-flags'
import ClubPlayersModal from './club-players-modal'

interface FavoriteClubsCardsProps {
  clubs: FavoriteClub[]
  onClubRemoved: (clubId: number) => void
  onNotesUpdated?: (clubId: number,newNotes: string) => void
  onContactsUpdated?: (clubId: number,contacts: ClubContact[]) => void
}

export default function FavoriteClubsCards({ clubs,onClubRemoved,onNotesUpdated,onContactsUpdated }: FavoriteClubsCardsProps) {
  const [editingNotes,setEditingNotes] = useState<number | null>(null)
  const [notesValue,setNotesValue] = useState('')
  const [savingNotes,setSavingNotes] = useState(false)
  const [removingClub,setRemovingClub] = useState<number | null>(null)
  const [clubToRemove,setClubToRemove] = useState<FavoriteClub | null>(null)
  const [selectedClub,setSelectedClub] = useState<FavoriteClub | null>(null)
  const [showPlayersModal,setShowPlayersModal] = useState(false)

  // Contact editing state - now manages array of contacts
  const [editingContactsForClub,setEditingContactsForClub] = useState<number | null>(null)
  const [contactsBeingEdited,setContactsBeingEdited] = useState<ClubContact[]>([])
  const [savingContacts,setSavingContacts] = useState(false)
  const [editingContactIndex,setEditingContactIndex] = useState<number | null>(null)

  const supabase = createClient()

  const handleStartEditNotes = (club: FavoriteClub) => {
    setEditingNotes(club.club_id)
    setNotesValue(club.notes || '')
  }

  const handleCancelEditNotes = () => {
    setEditingNotes(null)
    setNotesValue('')
  }

  const handleSaveNotes = async (clubId: number) => {
    try {
      setSavingNotes(true)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update notes using the add_favorite_club function (it upserts)
      const { error } = await supabase.rpc('add_favorite_club',{
        p_agent_id: user.id,
        p_club_id: clubId,
        p_notes: notesValue || null
      })

      if (error) throw error

      // Notify parent if callback provided
      if (onNotesUpdated) {
        onNotesUpdated(clubId,notesValue)
      }

      setEditingNotes(null)
      setNotesValue('')
    } catch (err: any) {
      console.error('Error saving notes:',err)
      alert('Failed to save notes: ' + err.message)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleStartEditContacts = (club: FavoriteClub) => {
    setEditingContactsForClub(club.club_id)
    setContactsBeingEdited([...club.contacts])
  }

  const handleCancelEditContacts = () => {
    setEditingContactsForClub(null)
    setContactsBeingEdited([])
    setEditingContactIndex(null)
  }

  const handleAddContact = () => {
    setContactsBeingEdited(prev => [...prev,{ name: '',email: '',phone: '',role: '',url: '',isFromScraper: false }])
    setEditingContactIndex(contactsBeingEdited.length)
  }

  const handleEditContact = (index: number) => {
    setEditingContactIndex(index)
  }

  const handleUpdateContact = (index: number,field: keyof ClubContact,value: string) => {
    setContactsBeingEdited(prev => prev.map((contact,i) =>
      i === index ? { ...contact,[field]: value || null } : contact
    ))
  }

  const handleDeleteContact = (index: number) => {
    setContactsBeingEdited(prev => prev.filter((_,i) => i !== index))
    if (editingContactIndex === index) {
      setEditingContactIndex(null)
    }
  }

  const handleSaveContacts = async (clubId: number) => {
    try {
      setSavingContacts(true)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update contacts array (pass as object, not stringified - Supabase handles JSONB conversion)
      const { error } = await supabase.rpc('update_club_contacts',{
        p_agent_id: user.id,
        p_club_id: clubId,
        p_contacts: contactsBeingEdited
      })

      if (error) throw error

      // Notify parent if callback provided
      if (onContactsUpdated) {
        onContactsUpdated(clubId,contactsBeingEdited)
      }

      setEditingContactsForClub(null)
      setContactsBeingEdited([])
      setEditingContactIndex(null)
    } catch (err: any) {
      console.error('Error saving contacts:',err)
      alert('Failed to save contact details: ' + err.message)
    } finally {
      setSavingContacts(false)
    }
  }

  const handleRemoveClub = async () => {
    if (!clubToRemove) return

    try {
      setRemovingClub(clubToRemove.club_id)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data,error } = await supabase.rpc('remove_favorite_club',{
        p_agent_id: user.id,
        p_club_id: clubToRemove.club_id
      })

      if (error) throw error

      if (data === false) {
        throw new Error('Club was not found in your favorites')
      }

      onClubRemoved(clubToRemove.club_id)
      setClubToRemove(null)
    } catch (err: any) {
      console.error('Error removing club:',err)
      alert('Failed to remove club: ' + (err.message || 'Unknown error'))
    } finally {
      setRemovingClub(null)
    }
  }

  const formatMarketValue = (value: number | null) => {
    if (!value) return 'N/A'
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return `${value}`
  }

  const handleViewPlayers = (club: FavoriteClub) => {
    setSelectedClub(club)
    setShowPlayersModal(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map((club) => (
          <Card
            key={club.favorite_id}
            className="overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all flex flex-col cursor-pointer group"
            onClick={() => handleViewPlayers(club)}
          >
            <CardContent className="p-0 flex flex-col flex-1">
              {/* Header with club logo */}
              <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6">
                {/* Hover hint */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Click to view squad
                  </Badge>
                </div>
                <div className="flex items-start gap-4">
                  {/* Club Logo - Clickable */}
                  <div className="flex-shrink-0">
                    {club.club_transfermarkt_url ? (
                      <a
                        href={club.club_transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:opacity-80 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {club.club_logo_url ? (
                          <img
                            src={club.club_logo_url}
                            alt={club.club_name}
                            className="w-24 h-24 object-contain border-2 border-background shadow-md cursor-pointer rounded-lg bg-white p-2"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md cursor-pointer">
                            <Building2 className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </a>
                    ) : (
                      <>
                        {club.club_logo_url ? (
                          <img
                            src={club.club_logo_url}
                            alt={club.club_name}
                            className="w-24 h-24 object-contain border-2 border-background shadow-md rounded-lg bg-white p-2"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md">
                            <Building2 className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Club Info */}
                  <div className="flex-1 min-w-0">
                    {/* Club Name - Clickable */}
                    {club.club_transfermarkt_url ? (
                      <a
                        href={club.club_transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h3 className="font-bold text-lg truncate mb-1">{club.club_name}</h3>
                      </a>
                    ) : (
                      <h3 className="font-bold text-lg truncate mb-1">{club.club_name}</h3>
                    )}

                    {/* Country */}
                    {club.country && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <span className="text-lg">{getCountryFlag(club.country)}</span>
                        <span>{club.country}</span>
                      </div>
                    )}

                    {/* League & Tier */}
                    {club.league_name && (
                      <div className="flex items-center gap-2">
                        {club.league_transfermarkt_url ? (
                          <a
                            href={club.league_transfermarkt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Badge variant="outline" className="text-xs border-2">
                              {club.league_name}
                            </Badge>
                          </a>
                        ) : (
                          <Badge variant="outline" className="text-xs border-2">
                            {club.league_name}
                          </Badge>
                        )}
                        {club.league_tier && (
                          <Badge variant="outline" className="text-xs">
                            Tier {club.league_tier}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Transfermarkt Link */}
                  {club.club_transfermarkt_url && (
                    <a
                      href={club.club_transfermarkt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col flex-1">
                {/* Top Section - Stats */}
                <div className="space-y-3 pb-3">
                  {/* Squad Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground" title="Squad Size">
                      <Users className="h-3 w-3" />
                      <span>{club.squad_size} players</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground" title="Average Squad Age">
                      <TrendingUp className="h-3 w-3" />
                      <span>{club.squad_avg_age ? `${club.squad_avg_age.toFixed(1)} yrs` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground" title="Total Market Value">
                      <Euro className="h-3 w-3" />
                      <span>{formatMarketValue(club.total_market_value_eur)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground" title="Average Market Value per Player">
                      <Euro className="h-3 w-3 opacity-50" />
                      <span>{formatMarketValue(club.avg_market_value_eur)}/p</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Section - Contact Details, Notes and Actions - Always at bottom */}
                <div className="mt-auto pt-4 space-y-3 border-t" onClick={(e) => e.stopPropagation()}>
                  {/* Contact Details Section */}
                  <div>
                    {editingContactsForClub === club.club_id ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground">Contacts ({contactsBeingEdited.length}):</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddContact()
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Contact
                          </Button>
                        </div>

                        {/* Contact Cards Grid - 2 per row */}
                        <div className="grid grid-cols-2 gap-2">
                          {contactsBeingEdited.map((contact,index) => (
                            <div
                              key={index}
                              className="p-2 bg-muted/30 rounded border space-y-1.5"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-muted-foreground">Contact {index + 1}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteContact(index)
                                  }}
                                  disabled={contact.isFromScraper === true}
                                  className="h-5 w-5 p-0"
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                              <Input
                                value={contact.name || ''}
                                onChange={(e) => handleUpdateContact(index,'name',e.target.value)}
                                placeholder="Name"
                                className="h-7 text-xs"
                              />
                              <Input
                                value={contact.role || ''}
                                onChange={(e) => handleUpdateContact(index,'role',e.target.value)}
                                placeholder="Role"
                                className="h-7 text-xs"
                              />
                              <Input
                                value={contact.email || ''}
                                onChange={(e) => handleUpdateContact(index,'email',e.target.value)}
                                placeholder="Email"
                                type="email"
                                className="h-7 text-xs"
                              />
                              <Input
                                value={contact.phone || ''}
                                onChange={(e) => handleUpdateContact(index,'phone',e.target.value)}
                                placeholder="Phone"
                                type="tel"
                                className="h-7 text-xs"
                              />
                              <Input
                                value={contact.url || ''}
                                onChange={(e) => handleUpdateContact(index,'url',e.target.value)}
                                placeholder="Profile URL"
                                className="h-7 text-xs"
                              />
                            </div>
                          ))}
                        </div>

                        {contactsBeingEdited.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No contacts yet. Click "Add Contact" to get started.
                          </p>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSaveContacts(club.club_id)
                            }}
                            disabled={savingContacts}
                            className="flex-1"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelEditContacts()
                            }}
                            disabled={savingContacts}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-muted-foreground">Contacts ({club.contacts.length}):</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartEditContacts(club)
                            }}
                            className="h-6 px-2"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Contact Cards Grid - 2 per row (View Mode) */}
                        {club.contacts.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {club.contacts.map((contact,index) => (
                              <div
                                key={index}
                                className="text-xs p-2 bg-muted/30 rounded border space-y-1"
                              >
                                {contact.name && (
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    {contact.url ? (
                                      <a
                                        href={contact.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium truncate text-primary hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {contact.name}
                                      </a>
                                    ) : (
                                      <span className="font-medium truncate">{contact.name}</span>
                                    )}
                                  </div>
                                )}
                                {contact.role && (
                                  <div className="flex items-center gap-1.5">
                                    <Briefcase className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-muted-foreground truncate">{contact.role}</span>
                                  </div>
                                )}
                                {contact.email && (
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <a
                                      href={`mailto:${contact.email}`}
                                      className="text-primary hover:underline truncate"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {contact.email}
                                    </a>
                                  </div>
                                )}
                                {contact.phone && (
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <a
                                      href={`tel:${contact.phone}`}
                                      className="text-primary hover:underline truncate"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {contact.phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs p-3 bg-muted/30 rounded border text-center text-muted-foreground italic">
                            No contacts added yet
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes Section */}
                  <div>
                    {editingNotes === club.club_id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add notes about this club..."
                          rows={3}
                          className="text-sm resize-none"
                          disabled={savingNotes}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSaveNotes(club.club_id)
                            }}
                            disabled={savingNotes}
                            className="flex-1"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelEditNotes()
                            }}
                            disabled={savingNotes}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartEditNotes(club)
                          }}
                          className="text-sm min-h-[3rem] p-2 bg-muted/30 rounded border cursor-text hover:bg-muted/50 transition-colors"
                        >
                          {club.notes || <span className="text-muted-foreground italic">Click to add notes...</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewPlayers(club)
                      }}
                      className="flex-1"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      View Squad
                    </Button>
                    {editingNotes !== club.club_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartEditNotes(club)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setClubToRemove(club)
                      }}
                      disabled={removingClub === club.club_id}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Remove club confirmation dialog */}
      <AlertDialog open={!!clubToRemove} onOpenChange={(open) => !open && setClubToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Club from Favorites?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{clubToRemove?.club_name}</strong> from your favorite clubs?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingClub}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveClub}
              disabled={!!removingClub}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removingClub ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Club Players Modal */}
      <ClubPlayersModal
        isOpen={showPlayersModal}
        onClose={() => {
          setShowPlayersModal(false)
          setSelectedClub(null)
        }}
        clubId={selectedClub?.club_id || null}
        clubName={selectedClub?.club_name || ''}
        clubLogoUrl={selectedClub?.club_logo_url || null}
      />
    </>
  )
}
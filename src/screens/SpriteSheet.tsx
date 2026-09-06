import { Px } from '../pixel/Px'
import type { Sprite } from '../pixel/sprite'
import { CHARACTERS } from '../pixel/sprites/characters'
import { ICONS } from '../pixel/sprites/icons'
import { PORTRAITS } from '../pixel/sprites/portraits'
import { TILES } from '../pixel/sprites/tiles'
import { Page } from '../components/ui'
import { useNav } from '../store/nav'

/** Developer contact sheet at #/sprites. Not linked from the game. */
export function SpriteSheet() {
  const go = useNav((s) => s.go)
  const scale = 4
  const cell = (name: string, s: Sprite, animate = true) => (
    <div key={name} className="px-box px-box-dark p-2 flex flex-col items-center gap-1" style={{ minWidth: 72 }}>
      <Px sprite={s} scale={scale} animate={animate} />
      <div className="text-[9px] text-muted font-pixel text-center">{name}</div>
    </div>
  )
  return (
    <Page title="Sprite sheet" onBack={() => go({ name: 'ladder' })}>
      <h2 className="px-h2 mb-2">Characters</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(CHARACTERS).flatMap(([k, c]) => [cell(`${k} down`, c.down), cell(`${k} up`, c.up), cell(`${k} left`, c.left), cell(`${k} sit`, c.sit)])}
      </div>
      <h2 className="px-h2 mb-2">Portraits</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(PORTRAITS).flatMap(([k, p]) => [cell(`${k} neutral`, p.neutral), cell(`${k} pleased`, p.pleased), cell(`${k} annoyed`, p.annoyed), cell(`${k} smug`, p.smug)])}
      </div>
      <h2 className="px-h2 mb-2">Tiles and furniture</h2>
      <div className="flex flex-wrap gap-2 mb-6">{Object.entries(TILES).map(([k, s]) => cell(k, s))}</div>
      <h2 className="px-h2 mb-2">Icons</h2>
      <div className="flex flex-wrap gap-2 mb-6">{Object.entries(ICONS).map(([k, s]) => cell(k, s))}</div>
    </Page>
  )
}

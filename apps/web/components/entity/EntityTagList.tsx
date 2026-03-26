interface Props {
  tags: string[]
}

export function EntityTagList({ tags }: Props) {
  if (!tags.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="rounded-full bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

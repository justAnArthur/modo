import { createElement, forwardRef } from 'react'

const TypedButton = forwardRef(({ size = 'md', ...props }, ref) =>
  createElement('button', { ref, type: 'button', 'data-size': size, ...props }),
)
export default TypedButton

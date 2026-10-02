/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/table.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `@/lib/*`, `@/hooks/*` and `@/components/ui/fluid-hover-highlight`
 *   imports rewritten to relative `../../lib/*` paths.
 * - Compound API: the parts hang off the root as statics (`Table.Header`,
 *   `Table.Body`, `Table.Row`, `Table.Head`, `Table.Cell`) via
 *   `Object.assign`; the root is cast to `TableComponent` so TS consumers see
 *   the statics. The upstream named exports are kept.
 * - `TableProps` members carry the FF docs API-table descriptions, so modo's
 *   parser lists them.
 * - `TableProps` / `TableRowProps` type exports added.
 * - TSDoc with the FF docs page's examples added above the root;
 *   `export default Table` added.
 * - Styling reads DS tokens (AGENTS.md styling): inline
 *   `fontVariationSettings` → `weight-*`; `duration-80|120|160` and
 *   tier-length JS durations → `duration-<tier>` / `spring.*`.
 */

import {
  useRef,
  useMemo,
  createContext,
  useContext,
  forwardRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type ReactNode,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "../../lib/utils";
import { SizeProvider, useSize, type SizeVariant } from "../../lib/size-context";
import { useFluidHover, useRegisterFluidHoverItem } from "../../lib/use-fluid-hover";
import { FluidHoverHighlight } from "../../lib/fluid-hover-highlight";

// ── Context ──────────────────────────────────────────────

interface TableContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number | null;
}

const TableContext = createContext<TableContextValue | null>(null);

// ── Table ────────────────────────────────────────────────

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** `Table.Header` and `Table.Body` children. */
  children: ReactNode;
  /** Pins the table's rows to one step of the size ladder (default 36px, compact 28px — see Sizes). Defaults to the surrounding SizeProvider, else `"default"`. */
  size?: SizeVariant;
}

/** The root plus its compound parts, typed so `<Table.Row>` type-checks. */
type TableComponent = ForwardRefExoticComponent<TableProps & RefAttributes<HTMLTableElement>> & {
  Header: typeof TableHeader;
  Body: typeof TableBody;
  Row: typeof TableRow;
  Head: typeof TableHead;
  Cell: typeof TableCell;
};

/**
 * Data table with row hover effects and semantic markup.
 *
 * A plain `<table>` whose body rows share one fluid hover highlight: the
 * background glides from row to row under the pointer, the row borders next
 * to the lit row fade out so it reads as one pill, and the lit row's cells
 * brighten from muted to foreground. Header cells render semibold, body
 * cells regular, with the weight change width-compensated. `size` pins every
 * row to one step of the size ladder; otherwise the table follows the
 * surrounding SizeProvider.
 *
 * Parts: `Table.Header` (`<thead>`), `Table.Body` (`<tbody>`), `Table.Row`
 * (`<tr>` — give body rows an `index`, starting at 0, so they join the hover
 * highlight; omit it on header rows), `Table.Head` (`<th>`) and `Table.Cell`
 * (`<td>`). Each forwards its ref and native attributes.
 */
const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ children, size, className, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sizeClasses = useSize(size);

    const hover = useFluidHover(containerRef);
    const {
      activeIndex,
      handlers,
      registerItem,
    } = hover;


    const contextValue = useMemo(
      () => ({ registerItem, activeIndex }),
      [registerItem, activeIndex]
    );

    const table = (
      <TableContext.Provider value={contextValue}>
        <div
          ref={containerRef}
          className="relative"
          onMouseEnter={handlers.onMouseEnter}
          onMouseMove={handlers.onMouseMove}
          onMouseLeave={handlers.onMouseLeave}
          onClick={handlers.onClick}
        >
          {/* Hover background */}
          <FluidHoverHighlight hover={hover} />

          <table
            ref={ref}
            className={cn("w-full border-collapse", sizeClasses.text, className)}
            {...props}
          >
            {children}
          </table>
        </div>
      </TableContext.Provider>
    );

    // A size prop pins every cell to one ladder step (cells read the context).
    return size ? <SizeProvider size={size}>{table}</SizeProvider> : table;
  }
) as TableComponent;

Table.displayName = "Table";

// ── TableHeader ──────────────────────────────────────────

const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("", className)} {...props} />
));

TableHeader.displayName = "TableHeader";

// ── TableBody ────────────────────────────────────────────

const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("", className)} {...props} />
));

TableBody.displayName = "TableBody";

// ── TableRow ─────────────────────────────────────────────

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  index?: number;
}

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ index, className, style, ...props }, ref) => {
    const internalRef = useRef<HTMLTableRowElement>(null);
    const ctx = useContext(TableContext);

    useRegisterFluidHoverItem(ctx?.registerItem, index, internalRef);

    const isBodyRow = index !== undefined;
    const activeIdx = ctx?.activeIndex ?? null;
    const hideBorder = activeIdx !== null && (
      (isBodyRow && (index === activeIdx || index === activeIdx - 1)) ||
      (!isBodyRow && activeIdx === 0)
    );

    return (
      <tr
        ref={(node) => {
          (internalRef as React.MutableRefObject<HTMLTableRowElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLTableRowElement | null>).current = node;
        }}
        data-fluid-hover-index={index}
        className={cn(
          "group/row relative z-10 border-b transition-[border-color] duration-fast",
          hideBorder ? "border-transparent" : "border-accent/40",
          isBodyRow && activeIdx === index && "is-active",
          isBodyRow ? "weight-normal" : "weight-semibold",
          className
        )}
        style={style}
        {...props}
      />
    );
  }
);

TableRow.displayName = "TableRow";

// ── TableHead ────────────────────────────────────────────

const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  const sizeClasses = useSize();
  return (
    <th
      ref={ref}
      className={cn(
        "text-left text-foreground",
        // py + line box lands the row on the ladder (36px / 28px).
        sizeClasses.variant === "compact" ? "px-2.5 py-[5px]" : "px-3 py-2",
        className
      )}
      {...props}
    />
  );
});

TableHead.displayName = "TableHead";

// ── TableCell ────────────────────────────────────────────

const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  const sizeClasses = useSize();
  return (
    <td
      ref={ref}
      className={cn(
        "text-muted-foreground transition-colors duration-fast group-[.is-active]/row:text-foreground",
        sizeClasses.variant === "compact" ? "px-2.5 py-[5px]" : "px-3 py-2",
        className
      )}
      {...props}
    />
  );
});

TableCell.displayName = "TableCell";

// ── Compound parts ───────────────────────────────────────

Object.assign(Table, {
  Header: TableHeader,
  Body: TableBody,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
});

// ── Exports ──────────────────────────────────────────────

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
export type { TableProps, TableRowProps };

export default Table

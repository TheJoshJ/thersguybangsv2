import { useEffect, useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/utils/formatDate";
import { formatTimestamp } from "@/utils/formatTimestamp";
import { RecordHighlights } from "./RecordHighlights";
import { useAllVideos, VideoRecord, TimestampEntry } from "@/hooks/useVideos";

const columns: ColumnDef<VideoRecord>[] = [
  {
    accessorKey: "source",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-1 sm:p-2 hidden sm:flex"
        >
          Platform
          <ArrowUpDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="capitalize pl-2 sm:pl-4 hidden sm:block">
        {row.getValue("source")}
      </div>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <div className="text-xs sm:text-sm line-clamp-2 min-w-[170px] max-w-[200px] sm:max-w-full">
        {row.getValue("title")}
      </div>
    ),
  },
  {
    accessorKey: "publishedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-1 sm:p-2 hidden sm:flex"
        >
          Date
          <ArrowUpDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="lowercase pl-2 sm:pl-4 hidden sm:block">
        {formatDate(row.getValue("publishedAt"))}
      </div>
    ),
  },
  {
    accessorKey: "bang_count",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-1 sm:p-2"
        >
          Bangs
          <ArrowUpDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="pl-2 sm:pl-4 text-center">
        {row.getValue("bang_count")}
      </div>
    ),
  },
  {
    accessorKey: "videoId",
    header: () => {
      return <div className="hidden sm:block">Data</div>;
    },
    cell: ({ row }) => {
      const rowData = row.original;

      const handleDownloadCSV = () => {
        const { title, bangs = [] } = rowData;

        const header = "timestamp,transcript";
        const csvContent = [
          header,
          ...bangs.map((b) =>
            [
              formatTimestamp(b.timestamp),
              `"${b.transcript.replace(/"/g, '""')}"`,
            ].join(",")
          ),
        ].join("\n");

        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `${title.replace(/[\\/:*?"<>|]/g, "")}-bangs.csv`
        );
        link.click();
      };

      return (
        <div className="flex justify-center hidden sm:flex">
          <Download
            onClick={handleDownloadCSV}
            size={16}
            className="cursor-pointer hover:text-primary"
          />
        </div>
      );
    },
  },
];

export function RecordsTable() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "publishedAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [selectedRow, setSelectedRow] = useState<string>("");

  const { data: records, isLoading } = useAllVideos();

  // Set the selected video to the first in the array
  useEffect(() => {
    if (records && records.length > 0 && !selectedRow) {
      setSelectedRow(records[0].videoId);
    }
  }, [records, selectedRow]);

  const getBangsForSelectedRow = (
    records: VideoRecord[],
    selectedRow: string
  ): TimestampEntry[] => {
    const foundRecord = records.find(
      (record) => record.videoId === selectedRow
    );
    return foundRecord?.bangs ?? [];
  };

  const table = useReactTable({
    data: records ?? [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p>Loading videos...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Youtube Embed & Timestamps */}
      <RecordHighlights
        bangData={getBangsForSelectedRow(records ?? [], selectedRow)}
        id={selectedRow}
      />

      {/* React Table */}
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border/50">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-4 text-xs sm:text-sm"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => {
                    setSelectedRow(row.getValue("videoId"));
                  }}
                  className="cursor-pointer hover:bg-secondary/20 border-b border-border/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-4 text-xs sm:text-sm"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-2">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

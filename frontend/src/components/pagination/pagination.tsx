import "./pagination.css";
import {
  Select,
  MenuItem,
  Pagination,
  FormControl,
  InputLabel,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ROWS_PER_PAGE_OPTIONS,
  SELECT_HEIGHT,
  SELECT_MIN_WIDTH,
} from "../../config";

interface PaginationControlsProps {
  page: number;
  rowsPerPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  rowsPerPageOptions?: number[]; // optional, default to ROWS_PER_PAGE_OPTIONS
}

export default function PaginationControls({
  page,
  rowsPerPage,
  total,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS,
}: PaginationControlsProps) {
  const pageCount = Math.ceil(total / rowsPerPage);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // < 600px

  const selectStyle = {
    height: SELECT_HEIGHT,
    minWidth: SELECT_MIN_WIDTH,
  };

  return (
    <Box className="pagination">
      {/* Select */}
      <FormControl>
        <InputLabel id="rows-per-page-label">Produits / page</InputLabel>
        <Select
          labelId="rows-per-page-label"
          label="Produits / page"
          value={rowsPerPage}
          onChange={(e) => {
            onRowsPerPageChange(Number(e.target.value));
            onPageChange(0);
          }}
          sx={selectStyle}
        >
          {rowsPerPageOptions.map((n) => (
            <MenuItem key={n} value={n} sx={selectStyle}>{n}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Pagination MUI — siblingCount réduit sur mobile pour éviter l'overflow */}
      <Pagination
        count={pageCount}
        page={page + 1}
        onChange={(_, value) => onPageChange(value - 1)}
        color="primary"
        siblingCount={isMobile ? 0 : 1}
        boundaryCount={1}
        size={isMobile ? "small" : "medium"}
      />
    </Box>
  );
}

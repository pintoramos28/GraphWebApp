'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { buildVariableNameMap, useImportStore } from '@/state/importStore';

const ExpressionEditorPanel = () => {
  const preview = useImportStore((state) => state.preview);
  const derivedColumns = useImportStore((state) => state.derivedColumns);
  const addDerivedColumn = useImportStore((state) => state.addDerivedColumn);
  const removeDerivedColumn = useImportStore((state) => state.removeDerivedColumn);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [expressionInput, setExpressionInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const variableMap = useMemo(() => {
    if (!preview) {
      return [] as Array<{ name: string; variable: string }>;
    }
    return buildVariableNameMap(preview.columns).map(({ name, variable }) => ({ name, variable }));
  }, [preview]);

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setNameInput('');
    setExpressionInput('');
    setError(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setError(null);
  };

  const handleSubmit = () => {
    try {
      addDerivedColumn(nameInput, expressionInput);
      handleCloseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expression');
    }
  };

  return (
    <Stack spacing={2} padding={2}>
      <Typography variant="h6">Expressions</Typography>
      {derivedColumns.length ? (
        <List dense disablePadding>
          {derivedColumns.map((column) => (
            <ListItem key={column.id} divider alignItems="flex-start">
              <ListItemText
                primary={column.name}
                secondary={
                  <Stack spacing={0.5} mt={0.5}>
                    <Typography variant="body2" component="span">
                      {column.expression}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="span">
                      Sample: {column.sampleValues.map((value) => String(value ?? '∅')).join(', ') || '—'}
                    </Typography>
                    {column.errorCount > 0 ? (
                      <Typography variant="caption" color="error" component="span">
                        {column.errorCount} rows failed to evaluate
                      </Typography>
                    ) : null}
                  </Stack>
                }
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" aria-label="Delete expression" onClick={() => removeDerivedColumn(column.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No expressions defined.
        </Typography>
      )}
      <Button
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        onClick={handleOpenDialog}
        disabled={!preview}
      >
        Add expression
      </Button>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add expression</DialogTitle>
        <DialogContent>
          <Stack spacing={2} marginTop={1}>
            {!preview ? (
              <Alert severity="info">Import data to define expressions.</Alert>
            ) : (
              <>
                <TextField
                  label="Column name"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  fullWidth
                  size="small"
                  autoFocus
                />
                <TextField
                  label="Expression"
                  value={expressionInput}
                  onChange={(event) => setExpressionInput(event.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                />
                <Typography variant="caption" color="text.secondary">
                  Use the variable names below when referencing columns. Standard Math functions are supported.
                </Typography>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Available variables
                  </Typography>
                  <Stack spacing={0.5} sx={{ maxHeight: 180, overflowY: 'auto', paddingRight: 1 }}>
                    {variableMap.map((entry) => (
                      <Typography key={entry.variable} variant="body2" color="text.secondary">
                        {entry.name} → <code>{entry.variable}</code>
                      </Typography>
                    ))}
                  </Stack>
                </Box>
                {error ? <Alert severity="error">{error}</Alert> : null}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!preview}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default ExpressionEditorPanel;

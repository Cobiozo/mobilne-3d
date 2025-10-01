import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, Plus, Trash2, GripVertical, Save, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Color {
  id: string;
  color_hex: string;
  color_name: string;
  is_active: boolean;
  sort_order: number;
}

export const ColorsManagement = () => {
  const [colors, setColors] = useState<Color[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newColor, setNewColor] = useState({ color_hex: "#000000", color_name: "" });
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    loadColors();
  }, []);

  const loadColors = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("available_colors")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setColors(data || []);
    } catch (error) {
      console.error("Error loading colors:", error);
      toast.error("Nie udało się załadować kolorów");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddColor = async () => {
    if (!newColor.color_name.trim()) {
      toast.error("Wprowadź nazwę koloru");
      return;
    }

    try {
      const maxOrder = Math.max(...colors.map(c => c.sort_order), 0);
      const { error } = await supabase
        .from("available_colors")
        .insert({
          color_hex: newColor.color_hex,
          color_name: newColor.color_name,
          sort_order: maxOrder + 1,
          is_active: true
        });

      if (error) throw error;

      toast.success("Kolor został dodany");
      setNewColor({ color_hex: "#000000", color_name: "" });
      setIsAddingNew(false);
      loadColors();
    } catch (error: any) {
      console.error("Error adding color:", error);
      if (error.code === '23505') {
        toast.error("Ten kolor już istnieje");
      } else {
        toast.error("Nie udało się dodać koloru");
      }
    }
  };

  const handleUpdateColor = async (id: string, updates: Partial<Color>) => {
    try {
      const { error } = await supabase
        .from("available_colors")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast.success("Kolor został zaktualizowany");
      loadColors();
      setEditingId(null);
    } catch (error) {
      console.error("Error updating color:", error);
      toast.error("Nie udało się zaktualizować koloru");
    }
  };

  const handleDeleteColor = async (id: string) => {
    try {
      const { error } = await supabase
        .from("available_colors")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Kolor został usunięty");
      setDeleteId(null);
      loadColors();
    } catch (error) {
      console.error("Error deleting color:", error);
      toast.error("Nie udało się usunąć koloru");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await handleUpdateColor(id, { is_active: !isActive });
  };

  const moveColor = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = colors.findIndex(c => c.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === colors.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newColors = [...colors];
    const temp = newColors[currentIndex];
    newColors[currentIndex] = newColors[newIndex];
    newColors[newIndex] = temp;

    // Update sort orders
    try {
      await Promise.all(
        newColors.map((color, index) =>
          supabase
            .from("available_colors")
            .update({ sort_order: index })
            .eq("id", color.id)
        )
      );

      loadColors();
      toast.success("Kolejność kolorów została zaktualizowana");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Nie udało się zaktualizować kolejności");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Zarządzanie kolorami
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Zarządzanie kolorami
            </div>
            <Button
              onClick={() => setIsAddingNew(true)}
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Dodaj kolor
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Add new color form */}
            {isAddingNew && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Kolor</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="color"
                          value={newColor.color_hex}
                          onChange={(e) =>
                            setNewColor({ ...newColor, color_hex: e.target.value })
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={newColor.color_hex}
                          onChange={(e) =>
                            setNewColor({ ...newColor, color_hex: e.target.value })
                          }
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Nazwa koloru</Label>
                      <Input
                        type="text"
                        value={newColor.color_name}
                        onChange={(e) =>
                          setNewColor({ ...newColor, color_name: e.target.value })
                        }
                        placeholder="np. Czerwony"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewColor({ color_hex: "#000000", color_name: "" });
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Anuluj
                    </Button>
                    <Button size="sm" onClick={handleAddColor}>
                      <Save className="w-4 h-4 mr-1" />
                      Zapisz
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Colors list */}
            {colors.map((color, index) => (
              <div
                key={color.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveColor(color.id, 'up')}
                    disabled={index === 0}
                  >
                    <GripVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div
                  className="w-12 h-12 rounded border-2 border-border shadow-sm flex-shrink-0"
                  style={{ backgroundColor: color.color_hex }}
                />

                {editingId === color.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      type="text"
                      value={color.color_hex}
                      onChange={(e) => {
                        setColors(
                          colors.map((c) =>
                            c.id === color.id ? { ...c, color_hex: e.target.value } : c
                          )
                        );
                      }}
                      className="h-9"
                    />
                    <Input
                      type="text"
                      value={color.color_name}
                      onChange={(e) => {
                        setColors(
                          colors.map((c) =>
                            c.id === color.id ? { ...c, color_name: e.target.value } : c
                          )
                        );
                      }}
                      className="h-9"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="font-medium">{color.color_name}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {color.color_hex}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Aktywny</Label>
                    <Switch
                      checked={color.is_active}
                      onCheckedChange={() => handleToggleActive(color.id, color.is_active)}
                    />
                  </div>

                  {editingId === color.id ? (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingId(null);
                          loadColors();
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleUpdateColor(color.id, color)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingId(color.id)}
                      >
                        <Palette className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteId(color.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {colors.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Palette className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Brak dostępnych kolorów</p>
                <p className="text-sm mt-2">Dodaj pierwszy kolor, aby rozpocząć</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten kolor?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Kolor zostanie usunięty z systemu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteColor(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
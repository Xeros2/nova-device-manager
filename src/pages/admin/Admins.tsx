import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, UserPlus } from "lucide-react";

export default function Admins() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administrateurs</h1>
          <p className="text-muted-foreground mt-1">Gérer les accès au panel admin</p>
        </div>
        <Button className="nova-gradient text-primary-foreground">
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Liste des administrateurs
          </CardTitle>
          <CardDescription>
            Utilisateurs ayant accès au panel d'administration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun administrateur configuré</p>
            <p className="text-sm mt-1">
              Créez un compte et ajoutez-le manuellement via la base de données
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

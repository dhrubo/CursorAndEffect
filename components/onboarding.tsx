"use client";

import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { PERSONAS } from "@/data/personas";
import { ProfileForm } from "@/components/profile-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EMPTY_PROFILE, type Profile } from "@/lib/profile";
import { useProfile } from "@/lib/use-profile";

export function PersonaPicker() {
  const router = useRouter();
  const { save } = useProfile();

  const load = (profile: Profile) => {
    save(structuredClone(profile));
    router.push("/plan");
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PERSONAS.map((persona) => (
        <Card key={persona.id} className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">{persona.profile.name}</CardTitle>
            <CardDescription>{persona.tagline}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {persona.highlights.map((h) => (
              <Badge key={h} variant="secondary">
                {h}
              </Badge>
            ))}
          </CardContent>
          <CardFooter className="mt-auto">
            <Button className="w-full" onClick={() => load(persona.profile)}>
              See {persona.profile.name}&apos;s plan <ArrowRightIcon />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export function OwnNumbers() {
  const router = useRouter();
  const { profile, loaded, save } = useProfile();

  if (!loaded) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <ProfileForm
      key={JSON.stringify(profile)}
      initial={profile ?? EMPTY_PROFILE}
      submitLabel={profile ? "Update my plan" : "See my plan"}
      onSubmit={(p) => {
        save(p);
        router.push("/plan");
      }}
    />
  );
}

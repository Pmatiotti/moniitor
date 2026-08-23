import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Clock, Video as VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  category: string;
  difficulty_level?: string;
  thumbnail_url?: string;
  video_url: string;
}

interface VideosListProps {
  onVideoWatched: () => void;
}

export const VideosList = ({ onVideoWatched }: VideosListProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('educational_videos')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      toast({
        title: "Erro ao carregar vídeos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "iniciante": return "bg-success/10 text-success";
      case "intermediário": 
      case "intermediario": return "bg-warning/10 text-warning";
      case "avançado": 
      case "avancado": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleWatchVideo = (video: Video) => {
    onVideoWatched();
    window.open(video.video_url, '_blank');
    toast({
      title: "Vídeo aberto",
      description: `Você está assistindo: ${video.title}`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <VideoIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum vídeo disponível no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <Card key={video.id} className="overflow-hidden hover:border-primary transition-colors">
          <div className="relative aspect-video bg-muted">
            {video.thumbnail_url ? (
              <img 
                src={video.thumbnail_url} 
                alt={video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <VideoIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Button 
                size="lg" 
                className="rounded-full"
                onClick={() => handleWatchVideo(video)}
              >
                <Play className="mr-2 h-5 w-5" />
                Assistir
              </Button>
            </div>
            {video.duration && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(video.duration)}
              </div>
            )}
          </div>
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <Badge variant="secondary">{video.category}</Badge>
              {video.difficulty_level && (
                <Badge className={getLevelColor(video.difficulty_level)}>
                  {video.difficulty_level}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{video.title}</CardTitle>
            {video.description && (
              <CardDescription className="line-clamp-2">{video.description}</CardDescription>
            )}
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

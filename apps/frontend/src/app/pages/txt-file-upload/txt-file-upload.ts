import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-txt-file-upload',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './txt-file-upload.html',
})
export class TxtFileUploadComponent {
    selectedFile: File | null = null;
    lines: string[] = [];

    loading = false;
    error: string | null = null;
    result: any = null;

    constructor(private http: HttpClient) { }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;

        this.error = null;
        this.result = null;

        if (!file) {
            this.selectedFile = null;
            this.lines = [];
            return;
        }

        if (file.type !== 'text/plain' && !file.name.toLowerCase().endsWith('.txt')) {
            alert('Bitte eine .txt-Datei auswählen.');
            this.selectedFile = null;
            this.lines = [];
            return;
        }

        this.selectedFile = file;
        this.lines = [];
    }

    parseFile(): void {
        if (!this.selectedFile) {
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const content = reader.result?.toString() ?? '';

            this.lines = content
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter((l) => l.length > 0);

            if (!this.lines.length) {
                return;
            }

            this.sendLines();
        };

        reader.onerror = (err) => {
            console.error('Fehler beim Lesen der Datei', err);
            this.error = 'Fehler beim Lesen der Datei.';
        };

        reader.readAsText(this.selectedFile, 'utf-8');
    }

    private sendLines(): void {
        this.loading = true;
        this.error = null;
        this.result = null;

        this.http.post('http://localhost:3000/api/sessions', this.lines).subscribe({
            next: (res) => {
                this.result = res;
                this.loading = false;
            },
            error: (err) => {
                console.error('Fehler beim Senden der Daten', err);
                this.error = 'Fehler beim Senden der Daten';
                this.loading = false;
            },
        });
    }
}

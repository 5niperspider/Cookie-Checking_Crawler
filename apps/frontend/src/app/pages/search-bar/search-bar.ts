import { Component, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  imports: [FormsModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
})
export class SearchBar {
  search = model<string> ('');
  
  searchButtonClick= output()
  
  searchClick(): void{
    this.searchButtonClick.emit();
  }


}

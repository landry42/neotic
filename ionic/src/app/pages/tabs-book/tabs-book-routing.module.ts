import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsBookPage } from './tabs-book.page';

const routes: Routes = [
  {
    path: '',
    component: TabsBookPage,
    children: [
      {
        path: 'story',
        children: [
          {
            path: '',
            loadChildren: () =>
              import('../story/story.module').then(m => m.StoryPageModule)
          }
        ]
      },
      {
        path: 'actors',
        children: [
          {
            path: '',
            loadChildren: () =>
              import('../actors/actors.module').then(m => m.ActorsPageModule)
          }
        ]
      },
      {
        path: 'places',
        children: [
          {
            path: '',
            loadChildren: () =>
              import('../places/places.module').then(m => m.PlacesPageModule)
          }
        ]
      },
      {
        path: '',
        redirectTo: 'story',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: 'story',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsBookPageRoutingModule {}
